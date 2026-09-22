import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Ride, RideStatus } from './entities/ride.entity';
import { Fare } from './entities/fare.entity';
import { Driver, DriverStatus } from 'src/drivers/entities/driver.entity';
import { CreateRideDto } from './dto/create-ride.dto';
import { CompleteRideDto } from './dto/complete-ride.dto';
import { PricingService } from './pricing.service';
import { MatchingService } from './matching.service';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class RidesService {
  private readonly logger = new Logger(RidesService.name);

  constructor(
    @InjectRepository(Ride)
    private readonly rideRepository: Repository<Ride>,
    @InjectRepository(Fare)
    private readonly fareRepository: Repository<Fare>,
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    private readonly pricingService: PricingService,
    private readonly matchingService: MatchingService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Create a new ride request for a rider and initiate driver search.
   */
  async createRide(riderId: string, dto: CreateRideDto): Promise<Ride> {
    // 1. Validate rider has no active ride
    const activeRide = await this.rideRepository.findOne({
      where: {
        riderId,
        status: In([
          RideStatus.REQUESTED,
          RideStatus.SEARCHING,
          RideStatus.DRIVER_ASSIGNED,
          RideStatus.DRIVER_ARRIVED,
          RideStatus.IN_PROGRESS,
        ]),
      },
    });

    if (activeRide) {
      throw new ConflictException('Rider already has an active ride request');
    }

    // 2. Calculate fare estimate for the requested category
    const category = dto.category.toLowerCase();
    const routeEstimate = await this.pricingService.estimateFare(
      dto.pickup_lat,
      dto.pickup_lng,
      dto.dest_lat,
      dto.dest_lng,
    );

    const categoryEstimate =
      routeEstimate.estimates.find((est) => est.category === category) ||
      routeEstimate.estimates[0];

    // 3. Create Ride record
    const ride = this.rideRepository.create({
      riderId,
      pickupLat: dto.pickup_lat,
      pickupLng: dto.pickup_lng,
      pickupAddress: dto.pickup_address || '',
      destLat: dto.dest_lat,
      destLng: dto.dest_lng,
      destAddress: dto.dest_address || '',
      category: categoryEstimate.category,
      status: RideStatus.REQUESTED,
    });

    const savedRide = await this.rideRepository.save(ride);

    // 4. Create Fare record
    const fare = this.fareRepository.create({
      rideId: savedRide.id,
      baseFare: categoryEstimate.baseFare,
      distanceFare: categoryEstimate.distanceFare,
      durationFare: categoryEstimate.durationFare,
      surgeMultiplier: categoryEstimate.surgeMultiplier,
      estimatedTotal: categoryEstimate.totalFare,
    });

    const savedFare = await this.fareRepository.save(fare);
    savedRide.fare = savedFare;

    // 5. Record initial status history
    await this.matchingService.recordStatusHistory(
      savedRide.id,
      RideStatus.REQUESTED,
      riderId,
      'Ride requested by rider',
    );

    // 6. Start driver search
    const matchedDriver = await this.matchingService.findNearestAvailableDriver(
      savedRide.pickupLat,
      savedRide.pickupLng,
      savedRide.category,
    );

    if (matchedDriver) {
      await this.matchingService.dispatchToDriver(
        matchedDriver.driver.id,
        savedRide.id,
      );
      savedRide.status = RideStatus.SEARCHING;
    }

    return savedRide;
  }

  /**
   * Driver accepts a dispatched ride
   */
  async acceptRide(driverId: string, rideId: string): Promise<Ride> {
    return this.matchingService.handleDriverAccept(driverId, rideId);
  }

  /**
   * Driver rejects a dispatched ride
   */
  async rejectRide(
    driverId: string,
    rideId: string,
    reason?: string,
  ): Promise<{ status: RideStatus; nextDriverId?: string }> {
    return this.matchingService.handleDriverReject(driverId, rideId, reason);
  }

  /**
   * Driver arrived at pickup location: updates status to DRIVER_ARRIVED
   */
  async driverArrived(driverId: string, rideId: string): Promise<Ride> {
    const ride = await this.getRideById(rideId);

    if (ride.driverId !== driverId) {
      throw new BadRequestException('You are not the assigned driver for this ride');
    }

    if (ride.status !== RideStatus.DRIVER_ASSIGNED) {
      throw new BadRequestException(
        `Cannot mark arrived for ride in status '${ride.status}'`,
      );
    }

    ride.status = RideStatus.DRIVER_ARRIVED;
    const savedRide = await this.rideRepository.save(ride);

    await this.matchingService.recordStatusHistory(
      rideId,
      RideStatus.DRIVER_ARRIVED,
      driverId,
      'Driver arrived at pickup location',
    );

    return savedRide;
  }

  /**
   * Start the trip: updates status to IN_PROGRESS and records tripStartedAt
   */
  async startTrip(driverId: string, rideId: string): Promise<Ride> {
    const ride = await this.getRideById(rideId);

    if (ride.driverId !== driverId) {
      throw new BadRequestException('You are not the assigned driver for this ride');
    }

    if (
      ride.status !== RideStatus.DRIVER_ARRIVED &&
      ride.status !== RideStatus.DRIVER_ASSIGNED
    ) {
      throw new BadRequestException(
        `Cannot start trip for ride in status '${ride.status}'`,
      );
    }

    ride.status = RideStatus.IN_PROGRESS;
    ride.tripStartedAt = new Date();
    const savedRide = await this.rideRepository.save(ride);

    await this.redisService.setDriverStatus(driverId, 'on_trip');

    await this.matchingService.recordStatusHistory(
      rideId,
      RideStatus.IN_PROGRESS,
      driverId,
      'Trip started by driver',
    );

    return savedRide;
  }

  /**
   * Complete the trip: recalculates final fare, updates ride/fare rows, sets driver back to available and re-adds to Redis GEO
   */
  async completeTrip(
    driverId: string,
    rideId: string,
    dto?: CompleteRideDto,
  ): Promise<Ride> {
    const ride = await this.getRideById(rideId);

    if (ride.driverId !== driverId) {
      throw new BadRequestException('You are not the assigned driver for this ride');
    }

    if (ride.status !== RideStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Cannot complete ride in status '${ride.status}'`,
      );
    }

    // 1. Calculate actual duration in minutes
    let actualDurationMin = dto?.actual_duration_min;
    if (actualDurationMin === undefined || actualDurationMin === null) {
      const startTime = ride.tripStartedAt
        ? new Date(ride.tripStartedAt).getTime()
        : Date.now();
      const elapsedMs = Date.now() - startTime;
      actualDurationMin = Math.max(1, Math.round((elapsedMs / 60000) * 10) / 10);
    }

    // 2. Calculate actual distance in km
    let actualDistanceKm = dto?.actual_distance_km;
    if (actualDistanceKm === undefined || actualDistanceKm === null) {
      const dropLat = dto?.dest_lat ?? ride.destLat;
      const dropLng = dto?.dest_lng ?? ride.destLng;
      const route = await this.pricingService.calculateDistanceAndDuration(
        ride.pickupLat,
        ride.pickupLng,
        dropLat,
        dropLng,
      );
      actualDistanceKm = route.distanceKm;
    }

    // 3. Recalculate final fare
    const finalFareCalc = this.pricingService.calculateFinalFare(
      ride.category,
      actualDistanceKm,
      actualDurationMin,
      ride.fare?.surgeMultiplier ?? 1.0,
    );

    // 4. Update Fare row
    if (ride.fare) {
      ride.fare.actualTotal = finalFareCalc.finalTotal;
      ride.fare.distanceFare = finalFareCalc.distanceFare;
      ride.fare.durationFare = finalFareCalc.durationFare;
      await this.fareRepository.save(ride.fare);
    }

    // 5. Update Ride row
    ride.status = RideStatus.COMPLETED;
    ride.tripCompletedAt = new Date();
    ride.actualDistanceKm = Math.round(actualDistanceKm * 10) / 10;
    ride.actualDurationMin = Math.round(actualDurationMin * 10) / 10;
    if (dto?.dest_lat) ride.destLat = dto.dest_lat;
    if (dto?.dest_lng) ride.destLng = dto.dest_lng;

    const savedRide = await this.rideRepository.save(ride);

    // 6. Record status history
    await this.matchingService.recordStatusHistory(
      rideId,
      RideStatus.COMPLETED,
      driverId,
      `Trip completed. Distance: ${ride.actualDistanceKm}km, Duration: ${ride.actualDurationMin}min, Final Fare: ₹${finalFareCalc.finalTotal}`,
    );

    // 7. Reset driver status to available and re-add to Redis GEO
    const driver = await this.driverRepository.findOne({ where: { id: driverId } });
    if (driver) {
      driver.status = DriverStatus.ONLINE;
      driver.currentLat = dto?.dest_lat ?? ride.destLat;
      driver.currentLng = dto?.dest_lng ?? ride.destLng;
      driver.lastLocationUpdate = new Date();
      await this.driverRepository.save(driver);
    }

    await this.redisService.setDriverStatus(driverId, 'available');
    const finalLat = dto?.dest_lat ?? ride.destLat;
    const finalLng = dto?.dest_lng ?? ride.destLng;
    await this.redisService.addDriverGeoLocation(driverId, finalLat, finalLng);

    return savedRide;
  }

  /**
   * Cancel a ride request (by rider or driver).
   * Checks if cancellation fee applies (if driver was already en route/arrived).
   * Updates ride status to CANCELLED.
   * If driver was assigned, sets driver back to available and re-adds to Redis GEO.
   * Records cancellation in RideStatusHistory and emits Kafka event hook.
   */
  async cancelRide(
    userId: string,
    rideId: string,
    reason?: string,
  ): Promise<Ride & { cancellationFee: number }> {
    const ride = await this.getRideById(rideId);

    if (
      ride.status === RideStatus.COMPLETED ||
      ride.status === RideStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot cancel ride with status '${ride.status}'`,
      );
    }

    // Determine whether caller is rider or driver
    const isRider = ride.riderId === userId;
    let isDriver = false;

    if (ride.driverId) {
      const driver = await this.driverRepository.findOne({
        where: { id: ride.driverId },
      });
      if (driver && (driver.id === userId || driver.userId === userId)) {
        isDriver = true;
      }
    }

    if (!isRider && !isDriver) {
      throw new ForbiddenException(
        'You are not authorized to cancel this ride',
      );
    }

    const cancelledBy = isRider ? 'rider' : 'driver';

    // Cancellation fee applies if rider cancels when driver was already assigned or arrived
    let cancellationFee = 0;
    if (
      isRider &&
      (ride.status === RideStatus.DRIVER_ASSIGNED ||
        ride.status === RideStatus.DRIVER_ARRIVED ||
        ride.status === RideStatus.IN_PROGRESS)
    ) {
      cancellationFee = 50;
      if (ride.fare) {
        ride.fare.actualTotal = cancellationFee;
        await this.fareRepository.save(ride.fare);
      }
      this.logger.log(
        `Processed cancellation fee payment of ₹${cancellationFee} for ride ${rideId}`,
      );
    }

    // Update ride status to CANCELLED
    ride.status = RideStatus.CANCELLED;
    const savedRide = await this.rideRepository.save(ride);

    // If driver was assigned, reset driver status to available & re-add to Redis GEO
    if (ride.driverId) {
      const driver = await this.driverRepository.findOne({
        where: { id: ride.driverId },
      });
      if (driver) {
        driver.status = DriverStatus.ONLINE;
        await this.driverRepository.save(driver);
        if (driver.currentLat != null && driver.currentLng != null) {
          await this.redisService.addDriverGeoLocation(
            driver.id,
            driver.currentLat,
            driver.currentLng,
          );
        }
      }
      await this.redisService.setDriverStatus(ride.driverId, 'available');
    }

    // Clear pending dispatch cache
    await this.redisService.invalidateRideCache(`dispatch:pending:${rideId}`);

    // Record in RideStatusHistory
    await this.matchingService.recordStatusHistory(
      rideId,
      RideStatus.CANCELLED,
      isRider ? ride.riderId : ride.driverId || userId,
      `Ride cancelled by ${cancelledBy}. Reason: ${reason || 'Not specified'}. Fee: ₹${cancellationFee}`,
    );

    // Emit ride.cancelled Kafka event (Phase 5 hook)
    this.logger.log(
      `[Kafka: transit.ride.cancelled] Ride ${rideId} cancelled by ${cancelledBy}. Fee: ₹${cancellationFee}`,
    );

    return Object.assign(savedRide, { cancellationFee });
  }

  /**
   * Get ride by ID with relations
   */
  async getRideById(rideId: string): Promise<Ride> {
    const ride = await this.rideRepository.findOne({
      where: { id: rideId },
      relations: ['fare', 'statusHistory'],
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    return ride;
  }
}
