import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Ride, RideStatus } from './entities/ride.entity';
import { Fare } from './entities/fare.entity';
import { CreateRideDto } from './dto/create-ride.dto';
import { PricingService } from './pricing.service';
import { MatchingService } from './matching.service';

@Injectable()
export class RidesService {
  constructor(
    @InjectRepository(Ride)
    private readonly rideRepository: Repository<Ride>,
    @InjectRepository(Fare)
    private readonly fareRepository: Repository<Fare>,
    private readonly pricingService: PricingService,
    private readonly matchingService: MatchingService,
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
   * Get ride by ID
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
