import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Ride, RideStatus } from './entities/ride.entity';
import { Fare } from './entities/fare.entity';
import { CreateRideDto } from './dto/create-ride.dto';
import { PricingService } from './pricing.service';

@Injectable()
export class RidesService {
  constructor(
    @InjectRepository(Ride)
    private readonly rideRepository: Repository<Ride>,
    @InjectRepository(Fare)
    private readonly fareRepository: Repository<Fare>,
    private readonly pricingService: PricingService,
  ) {}

  /**
   * Create a new ride request for a rider
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

    // Calculate fare estimate for the requested category
    const category = dto.category.toLowerCase();
    const routeEstimate = await this.pricingService.estimateFare(
      dto.pickup_lat,
      dto.pickup_lng,
      dto.dest_lat,
      dto.dest_lng,
    );

    const categoryEstimate = routeEstimate.estimates.find(
      (est) => est.category === category,
    ) || routeEstimate.estimates[0];

    //  Create Ride record
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

    //  Create Fare record
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

    return savedRide;
  }


  async getRideById(rideId: string): Promise<Ride> {
    const ride = await this.rideRepository.findOne({
      where: { id: rideId },
      relations: ['fare'],
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }
    
    return ride;
  }
}
