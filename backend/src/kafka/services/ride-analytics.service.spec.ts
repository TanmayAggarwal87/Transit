import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Ride, RideStatus } from '../../rides/entities/ride.entity';
import { Fare } from '../../rides/entities/fare.entity';
import { RideStatusHistory } from '../../rides/entities/ride-status-history.entity';
import { RideAnalytics } from '../../history/entities/ride-analytics.entity';
import {
  calculateRideMetrics,
  RideAnalyticsService,
} from './ride-analytics.service';

function completedRide(): Ride {
  return Object.assign(new Ride(), {
    id: 'ride-1',
    category: 'ev',
    status: RideStatus.COMPLETED,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    tripStartedAt: new Date('2026-10-01T00:05:00Z'),
    actualDistanceKm: 10,
    fare: Object.assign(new Fare(), {
      baseFare: 40,
      distanceFare: 30,
      durationFare: 30,
      surgeMultiplier: 0.9,
      estimatedTotal: 100,
      actualTotal: 90,
    }),
    statusHistory: [
      Object.assign(new RideStatusHistory(), {
        status: RideStatus.DRIVER_ARRIVED,
        createdAt: new Date('2026-10-01T00:04:30Z'),
      }),
    ],
  });
}

describe('ride analytics metrics', () => {
  it('uses arrival time, final fare, actual EV distance, and below-base discounts', () => {
    expect(calculateRideMetrics(completedRide(), 0.25)).toEqual({
      rideId: 'ride-1',
      waitTimeSeconds: 270,
      fareAccuracyPercent: 90,
      fareErrorPercent: -10,
      lowDemandSavings: 10,
      co2SavedKg: 2.5,
      co2BaselineKgPerKm: 0.25,
    });
  });

  it('does not claim savings on surge rides or EV savings on non-EV bookings', () => {
    const ride = completedRide();
    ride.category = 'sedan';
    ride.fare.surgeMultiplier = 1.5;
    ride.fare.actualTotal = 150;
    const metrics = calculateRideMetrics(ride, 0.25);
    expect(metrics.lowDemandSavings).toBe(0);
    expect(metrics.co2SavedKg).toBe(0);
    expect(metrics.co2BaselineKgPerKm).toBeNull();
  });

  it('keeps unknown metrics null and falls back to trip start when arrival is missing', () => {
    const ride = completedRide();
    ride.statusHistory = [];
    ride.actualDistanceKm = null;
    ride.fare.actualTotal = null;
    const metrics = calculateRideMetrics(ride, 0.25);
    expect(metrics.waitTimeSeconds).toBe(300);
    expect(metrics.fareAccuracyPercent).toBeNull();
    expect(metrics.lowDemandSavings).toBeNull();
    expect(metrics.co2SavedKg).toBeNull();
    expect(metrics).not.toHaveProperty('positioningSuggestionFollowed');
  });

  it('handles zero estimates and invalid dates without persisting NaN or infinity', () => {
    const ride = completedRide();
    ride.createdAt = new Date('invalid');
    ride.fare.estimatedTotal = 0;
    const metrics = calculateRideMetrics(ride, 0.25);
    expect(metrics.waitTimeSeconds).toBeNull();
    expect(metrics.fareAccuracyPercent).toBeNull();
    expect(metrics.fareErrorPercent).toBeNull();
  });
});

describe('RideAnalyticsService', () => {
  const rideRepository = { findOne: jest.fn() };
  const analyticsRepository = { upsert: jest.fn() };
  let service: RideAnalyticsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new RideAnalyticsService(
      rideRepository as unknown as Repository<Ride>,
      analyticsRepository as unknown as Repository<RideAnalytics>,
      { get: () => '0.25' } as unknown as ConfigService,
    );
  });

  it('writes by unique ride key on redelivery and preserves future positioning observations', async () => {
    rideRepository.findOne.mockResolvedValue(completedRide());
    await service.writeAnalytics('ride-1');
    await service.writeAnalytics('ride-1');
    expect(analyticsRepository.upsert).toHaveBeenCalledTimes(2);
    for (const [metrics, options] of analyticsRepository.upsert.mock.calls) {
      expect(metrics).toEqual(
        expect.objectContaining({ rideId: 'ride-1', co2SavedKg: 2.5 }),
      );
      expect(metrics).not.toHaveProperty('positioningSuggestionFollowed');
      expect(options).toEqual({
        conflictPaths: ['rideId'],
        skipUpdateIfNoValuesChanged: true,
      });
    }
  });

  it('never writes completion analytics for an active or missing ride', async () => {
    rideRepository.findOne.mockResolvedValue({
      ...completedRide(),
      status: RideStatus.IN_PROGRESS,
    });
    await expect(service.writeAnalytics('ride-1')).resolves.toEqual({
      success: false,
      rideId: 'ride-1',
    });
    rideRepository.findOne.mockResolvedValue(null);
    await service.writeAnalytics('missing');
    expect(analyticsRepository.upsert).not.toHaveBeenCalled();
  });

  it('continues catch-up after one record fails so later rides are not skipped', async () => {
    const builder = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest
        .fn()
        .mockResolvedValue([{ id: 'ride-1' }, { id: 'ride-2' }]),
    };
    const repository = {
      ...rideRepository,
      createQueryBuilder: jest.fn(() => builder),
    };
    const catchUpService = new RideAnalyticsService(
      repository as unknown as Repository<Ride>,
      analyticsRepository as unknown as Repository<RideAnalytics>,
      { get: () => '0.25' } as unknown as ConfigService,
    );
    const write = jest
      .spyOn(catchUpService, 'writeAnalytics')
      .mockRejectedValueOnce(new Error('Transient database failure'))
      .mockResolvedValueOnce({ success: true, rideId: 'ride-2' });
    await catchUpService.backfillMissingAnalytics();
    expect(write).toHaveBeenNthCalledWith(1, 'ride-1');
    expect(write).toHaveBeenNthCalledWith(2, 'ride-2');
    expect(builder.take).toHaveBeenCalledWith(100);
  });
});
