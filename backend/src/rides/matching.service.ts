import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ride, RideStatus } from './entities/ride.entity';
import { RideStatusHistory } from './entities/ride-status-history.entity';
import { Driver, DriverOnboardingStatus, DriverStatus } from 'src/drivers/entities/driver.entity';
import { FuelType } from 'src/drivers/entities/vehicle.entity';
import { RedisService } from 'src/redis/redis.service';

export interface DriverMatchResult {
  driver: Driver;
  distanceKm?: number;
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    @InjectRepository(Ride)
    private readonly rideRepository: Repository<Ride>,
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    @InjectRepository(RideStatusHistory)
    private readonly statusHistoryRepository: Repository<RideStatusHistory>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Find nearest available driver matching vehicle category criteria within radius.
   */
  async findNearestAvailableDriver(
    pickupLat: number,
    pickupLng: number,
    category: string = 'hatchback',
    excludedDriverIds: string[] = [],
  ): Promise<DriverMatchResult | null> {
    const radiusKm = 5;
    const candidates = await this.redisService.getAvailableDriversInRadius(
      pickupLat,
      pickupLng,
      radiusKm,
      20,
    );

    for (const candidate of candidates) {
      if (excludedDriverIds.includes(candidate.driverId)) {
        continue;
      }

      // Step 2: Validate status = 'available' in Redis
      const redisStatus = await this.redisService.getDriverStatus(candidate.driverId);
      if (redisStatus && redisStatus !== 'available') {
        continue;
      }

      // Fetch driver from DB with relations
      const driver = await this.driverRepository.findOne({
        where: { id: candidate.driverId },
        relations: ['vehicles', 'user'],
      });

      if (!driver || !driver.isActive) {
        continue;
      }

      // Validate onboarding / verification
      if (driver.onboardingStatus !== DriverOnboardingStatus.VERIFIED) {
        continue;
      }

      // Check category match
      const isEvCategory = category.toLowerCase() === 'ev';
      if (isEvCategory) {
        const hasEv = driver.vehicles?.some(
          (v) => v.isActive && v.fuelType === FuelType.EV,
        );
        if (!hasEv) {
          continue;
        }
      }

      return {
        driver,
        distanceKm: candidate.distance,
      };
    }

    return null;
  }

  /**
   * Dispatch ride to driver: sets status to SEARCHING and stores pending dispatch key in Redis with 30s TTL.
   */
  async dispatchToDriver(driverId: string, rideId: string): Promise<boolean> {
    const ride = await this.rideRepository.findOne({ where: { id: rideId } });
    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    ride.status = RideStatus.SEARCHING;
    await this.rideRepository.save(ride);

    await this.recordStatusHistory(
      rideId,
      RideStatus.SEARCHING,
      'system',
      `Dispatch request sent to driver ${driverId}`,
    );

    // Set 30-second TTL pending dispatch in Redis
    await this.redisService.setRideCache(
      `dispatch:pending:${rideId}`,
      { driverId, dispatchedAt: Date.now() },
      30,
    );

    this.logger.log(`Ride ${rideId} dispatched to driver ${driverId}`);
    return true;
  }

  /**
   * Handle driver accepting the ride.
   */
  async handleDriverAccept(driverId: string, rideId: string): Promise<Ride> {
    const ride = await this.rideRepository.findOne({
      where: { id: rideId },
      relations: ['fare'],
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    if (
      ride.status !== RideStatus.REQUESTED &&
      ride.status !== RideStatus.SEARCHING
    ) {
      throw new BadRequestException(`Cannot accept ride with status '${ride.status}'`);
    }

    // Verify pending dispatch
    const pendingDispatch = await this.redisService.getRideCache<{ driverId: string }>(
      `dispatch:pending:${rideId}`,
    );
    if (pendingDispatch && pendingDispatch.driverId !== driverId) {
      throw new BadRequestException('This ride dispatch was not assigned to you');
    }

    // Update ride
    ride.status = RideStatus.DRIVER_ASSIGNED;
    ride.driverId = driverId;
    const savedRide = await this.rideRepository.save(ride);

    // Update driver status in DB & Redis
    const driver = await this.driverRepository.findOne({ where: { id: driverId } });
    if (driver) {
      driver.status = DriverStatus.ON_RIDE;
      await this.driverRepository.save(driver);
    }
    await this.redisService.setDriverStatus(driverId, 'on_trip');
    await this.redisService.removeDriverGeoLocation(driverId);

    // Record status history
    await this.recordStatusHistory(
      rideId,
      RideStatus.DRIVER_ASSIGNED,
      driverId,
      'Driver accepted ride dispatch',
    );

    // Clear pending dispatch
    await this.redisService.invalidateRideCache(`dispatch:pending:${rideId}`);

    return savedRide;
  }

  /**
   * Handle driver rejecting the ride.
   */
  async handleDriverReject(
    driverId: string,
    rideId: string,
    reason?: string,
  ): Promise<{ status: RideStatus; nextDriverId?: string }> {
    const ride = await this.rideRepository.findOne({ where: { id: rideId } });
    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    // Record rejected driver in Redis
    const rejectedKey = `ride:rejected:${rideId}`;
    const rejectedDrivers: string[] =
      (await this.redisService.getRideCache<string[]>(rejectedKey)) || [];

    if (!rejectedDrivers.includes(driverId)) {
      rejectedDrivers.push(driverId);
      await this.redisService.setRideCache(rejectedKey, rejectedDrivers, 3600);
    }

    await this.recordStatusHistory(
      rideId,
      ride.status,
      driverId,
      `Driver rejected ride. Reason: ${reason || 'Not specified'}`,
    );

    // If 3 or more rejections, mark ride as NO_DRIVERS_FOUND
    if (rejectedDrivers.length >= 3) {
      ride.status = RideStatus.NO_DRIVERS_FOUND;
      await this.rideRepository.save(ride);

      await this.recordStatusHistory(
        rideId,
        RideStatus.NO_DRIVERS_FOUND,
        'system',
        'Maximum driver rejection limit (3) reached',
      );

      await this.redisService.invalidateRideCache(`dispatch:pending:${rideId}`);
      return { status: RideStatus.NO_DRIVERS_FOUND };
    }

    // Try finding next candidate driver
    const nextMatch = await this.findNearestAvailableDriver(
      ride.pickupLat,
      ride.pickupLng,
      ride.category,
      rejectedDrivers,
    );

    if (nextMatch) {
      await this.dispatchToDriver(nextMatch.driver.id, rideId);
      return {
        status: RideStatus.SEARCHING,
        nextDriverId: nextMatch.driver.id,
      };
    }

    // No other drivers found in radius
    ride.status = RideStatus.NO_DRIVERS_FOUND;
    await this.rideRepository.save(ride);

    await this.recordStatusHistory(
      rideId,
      RideStatus.NO_DRIVERS_FOUND,
      'system',
      'No other available drivers found in radius',
    );

    await this.redisService.invalidateRideCache(`dispatch:pending:${rideId}`);
    return { status: RideStatus.NO_DRIVERS_FOUND };
  }

  /**
   * Helper to record status change in RideStatusHistory table.
   */
  async recordStatusHistory(
    rideId: string,
    status: RideStatus,
    changedBy?: string,
    comment?: string,
  ): Promise<RideStatusHistory> {
    const history = this.statusHistoryRepository.create({
      rideId,
      status,
      changedBy: changedBy || null,
      comment: comment || null,
    });
    return this.statusHistoryRepository.save(history);
  }
}
