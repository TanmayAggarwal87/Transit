import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RidesService } from './rides.service';
import { Ride, RideStatus } from './entities/ride.entity';
import { Fare } from './entities/fare.entity';
import { Driver, DriverStatus } from 'src/drivers/entities/driver.entity';
import { PricingService } from './pricing.service';
import { MatchingService } from './matching.service';
import { RedisService } from 'src/redis/redis.service';
import { EventsService } from 'src/kafka/events.service';
import { KafkaTopic } from 'src/kafka/kafka.constants';

describe('RidesService', () => {
  let service: RidesService;
  let rideRepo: any;
  let fareRepo: any;
  let driverRepo: any;
  let redisService: any;
  let matchingService: any;
  let eventsService: any;

  beforeEach(async () => {
    rideRepo = {
      findOne: jest.fn(),
      save: jest.fn((r) => Promise.resolve(r)),
      create: jest.fn((r) => r),
    };
    fareRepo = {
      save: jest.fn((f) => Promise.resolve(f)),
      create: jest.fn((f) => f),
    };
    driverRepo = {
      findOne: jest.fn(),
      save: jest.fn((d) => Promise.resolve(d)),
    };
    redisService = {
      setDriverStatus: jest.fn(),
      addDriverGeoLocation: jest.fn(),
      invalidateRideCache: jest.fn(),
    };
    matchingService = {
      recordStatusHistory: jest.fn(),
      findNearestAvailableDriver: jest.fn(),
      dispatchToDriver: jest.fn(),
    };
    eventsService = {
      emit: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RidesService,
        { provide: getRepositoryToken(Ride), useValue: rideRepo },
        { provide: getRepositoryToken(Fare), useValue: fareRepo },
        { provide: getRepositoryToken(Driver), useValue: driverRepo },
        { provide: PricingService, useValue: {} },
        { provide: MatchingService, useValue: matchingService },
        { provide: RedisService, useValue: redisService },
        { provide: EventsService, useValue: eventsService },
      ],
    }).compile();

    service = module.get<RidesService>(RidesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('cancelRide', () => {
    it('should cancel a ride in REQUESTED status by rider with zero cancellation fee', async () => {
      const mockRide = {
        id: 'ride-1',
        riderId: 'user-rider-1',
        driverId: null,
        status: RideStatus.REQUESTED,
        category: 'hatchback',
        fare: { id: 'fare-1', estimatedTotal: 150, baseFare: 40 },
      };
      rideRepo.findOne.mockResolvedValue(mockRide);

      const result = await service.cancelRide('user-rider-1', 'ride-1', 'Changed mind');

      expect(result.status).toBe(RideStatus.CANCELLED);
      expect(result.cancellationFee).toBe(0);
      expect(matchingService.recordStatusHistory).toHaveBeenCalled();
      expect(eventsService.emit).toHaveBeenCalledWith(
        KafkaTopic.RIDE_CANCELLED,
        expect.objectContaining({
          rideId: 'ride-1',
          cancelledBy: 'rider',
        }),
      );
    });

    it('should charge cancellation fee when rider cancels after driver is assigned', async () => {
      const mockRide = {
        id: 'ride-2',
        riderId: 'user-rider-1',
        driverId: 'driver-1',
        status: RideStatus.DRIVER_ASSIGNED,
        category: 'hatchback',
        fare: { id: 'fare-2', estimatedTotal: 150, baseFare: 40 },
      };
      const mockDriver = {
        id: 'driver-1',
        userId: 'user-driver-1',
        status: DriverStatus.ON_RIDE,
        currentLat: 12.97,
        currentLng: 77.59,
      };
      rideRepo.findOne.mockResolvedValue(mockRide);
      driverRepo.findOne.mockResolvedValue(mockDriver);

      const result = await service.cancelRide('user-rider-1', 'ride-2');

      expect(result.status).toBe(RideStatus.CANCELLED);
      expect(result.cancellationFee).toBe(50);
      expect(redisService.setDriverStatus).toHaveBeenCalledWith('driver-1', 'available');
      expect(redisService.addDriverGeoLocation).toHaveBeenCalledWith('driver-1', 12.97, 77.59);
    });

    it('should allow assigned driver to cancel ride without fee', async () => {
      const mockRide = {
        id: 'ride-3',
        riderId: 'user-rider-1',
        driverId: 'driver-1',
        status: RideStatus.DRIVER_ASSIGNED,
        fare: { id: 'fare-3', estimatedTotal: 150 },
      };
      const mockDriver = {
        id: 'driver-1',
        userId: 'user-driver-1',
        status: DriverStatus.ON_RIDE,
      };
      rideRepo.findOne.mockResolvedValue(mockRide);
      driverRepo.findOne.mockResolvedValue(mockDriver);

      const result = await service.cancelRide('user-driver-1', 'ride-3', 'Vehicle issue');

      expect(result.status).toBe(RideStatus.CANCELLED);
      expect(result.cancellationFee).toBe(0);
      expect(redisService.setDriverStatus).toHaveBeenCalledWith('driver-1', 'available');
    });

    it('should throw BadRequestException if ride is already completed', async () => {
      const mockRide = {
        id: 'ride-4',
        riderId: 'user-rider-1',
        status: RideStatus.COMPLETED,
      };
      rideRepo.findOne.mockResolvedValue(mockRide);

      await expect(service.cancelRide('user-rider-1', 'ride-4')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException if user is not rider or assigned driver', async () => {
      const mockRide = {
        id: 'ride-5',
        riderId: 'user-rider-1',
        driverId: 'driver-1',
        status: RideStatus.SEARCHING,
      };
      rideRepo.findOne.mockResolvedValue(mockRide);
      driverRepo.findOne.mockResolvedValue(null);

      await expect(service.cancelRide('random-user', 'ride-5')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
