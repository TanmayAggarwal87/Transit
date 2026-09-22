import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { Driver, DriverStatus } from './entities/driver.entity';
import { DriverLocationHistory } from './entities/driver-location-history.entity';
import { User } from 'src/users/entities/user.entity';
import { BankAccount } from './entities/bank-account.entity';
import { DriverDocumentsService } from './driver-documents.service';
import { RedisService } from 'src/redis/redis.service';

describe('DriversService', () => {
  let service: DriversService;
  let driverRepo: any;
  let userRepo: any;
  let bankAccountRepo: any;
  let driverLocationHistoryRepo: any;
  let driverDocumentsService: any;
  let redisService: any;

  beforeEach(async () => {
    driverRepo = {
      findOne: jest.fn(),
      save: jest.fn((d) => Promise.resolve(d)),
      create: jest.fn((d) => d),
    };
    userRepo = {
      findOne: jest.fn(),
      save: jest.fn((u) => Promise.resolve(u)),
    };
    bankAccountRepo = {
      create: jest.fn((b) => b),
      save: jest.fn((b) => Promise.resolve(b)),
    };
    driverLocationHistoryRepo = {
      create: jest.fn((h) => h),
      save: jest.fn((h) => Promise.resolve(h)),
    };
    driverDocumentsService = {
      uploadDocument: jest.fn(),
      findByDriverId: jest.fn(),
      getSignedViewUrl: jest.fn(),
    };
    redisService = {
      setDriverStatus: jest.fn(),
      removeDriverGeoLocation: jest.fn(),
      setDriverLocation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriversService,
        { provide: getRepositoryToken(Driver), useValue: driverRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(BankAccount), useValue: bankAccountRepo },
        {
          provide: getRepositoryToken(DriverLocationHistory),
          useValue: driverLocationHistoryRepo,
        },
        { provide: DriverDocumentsService, useValue: driverDocumentsService },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<DriversService>(DriversService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateDriverLocation', () => {
    it('should update driver location in DB and Redis', async () => {
      const mockDriver = {
        id: 'driver-1',
        userId: 'user-1',
        currentLat: null,
        currentLng: null,
        heading: null,
        lastLocationUpdate: null,
      };
      driverRepo.findOne.mockResolvedValue(mockDriver);

      const result = await service.updateDriverLocation('user-1', {
        lat: 12.9716,
        lng: 77.5946,
        heading: 90,
      });

      expect(result.success).toBe(true);
      expect(mockDriver.currentLat).toBe(12.9716);
      expect(mockDriver.currentLng).toBe(77.5946);
      expect(mockDriver.heading).toBe(90);
      expect(redisService.setDriverLocation).toHaveBeenCalledWith(
        'driver-1',
        12.9716,
        77.5946,
        90,
      );
      expect(driverLocationHistoryRepo.create).not.toHaveBeenCalled();
    });

    it('should record DriverLocationHistory when ride_id is provided', async () => {
      const mockDriver = {
        id: 'driver-1',
        userId: 'user-1',
      };
      driverRepo.findOne.mockResolvedValue(mockDriver);

      await service.updateDriverLocation('user-1', {
        lat: 12.9716,
        lng: 77.5946,
        heading: 180,
        speed_kmh: 45.5,
        ride_id: 'ride-123',
      });

      expect(driverLocationHistoryRepo.create).toHaveBeenCalledWith({
        driverId: 'driver-1',
        rideId: 'ride-123',
        lat: 12.9716,
        lng: 77.5946,
        heading: 180,
        speedKmh: 45.5,
      });
      expect(driverLocationHistoryRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if driver not found', async () => {
      driverRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateDriverLocation('user-unknown', {
          lat: 12.9716,
          lng: 77.5946,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleStatus', () => {
    it('should set driver online and update redis location if driver has coordinates', async () => {
      const mockDriver = {
        id: 'driver-1',
        userId: 'user-1',
        status: DriverStatus.OFFLINE,
        currentLat: 12.97,
        currentLng: 77.59,
        heading: 45,
      };
      driverRepo.findOne.mockResolvedValue(mockDriver);

      await service.toggleStatus('user-1', {} as any);

      expect(mockDriver.status).toBe(DriverStatus.ONLINE);
      expect(redisService.setDriverStatus).toHaveBeenCalledWith('driver-1', 'available');
      expect(redisService.setDriverLocation).toHaveBeenCalledWith('driver-1', 12.97, 77.59, 45);
    });
  });
});
