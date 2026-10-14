import { ForbiddenException } from '@nestjs/common';
import { RideStatus } from '../rides/entities/ride.entity';
import { SafetyService } from './safety.service';
import { SosAlertStatus } from './entities/sos-alert.entity';

describe('SafetyService', () => {
  const ride = {
    id: 'ride-1',
    riderId: 'rider-1',
    driverId: null,
    status: RideStatus.SEARCHING,
  };
  let service: SafetyService;
  let sosAlertRepository: any;
  let rideRepository: any;
  let userRepository: any;
  let driverRepository: any;
  let notificationsService: any;
  let realtimeService: any;
  let redisService: any;
  let jwtService: any;
  let configService: any;

  beforeEach(() => {
    sosAlertRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({
        ...value,
        id: 'alert-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      })),
    };
    rideRepository = { findOne: jest.fn().mockResolvedValue(ride) };
    userRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'rider-1',
        name: 'Rider',
        emergencyContact: '+15551234567',
      }),
    };
    driverRepository = { findOne: jest.fn().mockResolvedValue(null) };
    notificationsService = { sendSms: jest.fn().mockResolvedValue(true) };
    realtimeService = { emitToRide: jest.fn(), emitToUser: jest.fn() };
    redisService = { getDriverLocation: jest.fn().mockResolvedValue(null) };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
      verifyAsync: jest.fn(),
    };
    configService = { get: jest.fn().mockReturnValue(undefined) };
    service = new SafetyService(
      sosAlertRepository,
      rideRepository,
      userRepository,
      driverRepository,
      notificationsService,
      realtimeService,
      redisService,
      jwtService,
      configService,
    );
  });

  it('rejects SOS requests from users who are not ride participants', async () => {
    await expect(
      service.triggerSos('stranger', ride.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(sosAlertRepository.save).not.toHaveBeenCalled();
    expect(notificationsService.sendSms).not.toHaveBeenCalled();
  });

  it('creates an SOS record, alerts the emergency contact, and emits the ride event', async () => {
    const result = await service.triggerSos('rider-1', ride.id);

    expect(sosAlertRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        rideId: ride.id,
        triggeredByUserId: 'rider-1',
        triggeredByRole: 'rider',
        status: SosAlertStatus.OPEN,
      }),
    );
    expect(notificationsService.sendSms).toHaveBeenCalledWith(
      '+15551234567',
      expect.stringContaining(ride.id),
    );
    expect(realtimeService.emitToRide).toHaveBeenCalledWith(
      ride.id,
      'sos:triggered',
      expect.objectContaining({ alertId: 'alert-1' }),
    );
    expect(result.emergencyContactNotified).toBe(true);
  });

  it('returns a trip location only for a valid short-lived share token', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      purpose: 'trip-share',
      rideId: ride.id,
    });
    const result = await service.getSharedTrip('signed-token');
    expect(result).toEqual({
      rideId: ride.id,
      status: RideStatus.SEARCHING,
      location: null,
      locationAvailable: false,
    });
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('signed-token');
  });
});
