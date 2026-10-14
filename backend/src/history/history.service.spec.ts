import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Driver } from '../drivers/entities/driver.entity';
import { Ride, RideStatus } from '../rides/entities/ride.entity';
import { RideAnalytics } from './entities/ride-analytics.entity';
import { RideHistoryQueryDto } from './dto/ride-history-query.dto';
import { getRideHistoryDateBounds, HistoryService } from './history.service';

describe('history date filters', () => {
  it('includes the full UTC end day for a date-only range', () => {
    const bounds = getRideHistoryDateBounds(
      Object.assign(new RideHistoryQueryDto(), {
        date_range: '2026-10-01,2026-10-31',
      }),
    );
    expect(bounds.dateFrom?.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(bounds.dateTo?.toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });

  it.each([
    { date_range: '2026-10-31,2026-10-01' },
    { date_range: '2026-02-30,2026-03-01' },
    { date_range: '2026-10-01' },
    { date_range: '2026-10-01,2026-10-31', date_from: '2026-10-01' },
    { date_from: '2026-10-01T01:00:00' },
  ])('rejects ambiguous or invalid ranges: %o', (fields) => {
    expect(() =>
      getRideHistoryDateBounds(
        Object.assign(new RideHistoryQueryDto(), fields),
      ),
    ).toThrow(BadRequestException);
  });
});

function queryBuilder() {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getRawMany: jest.fn().mockResolvedValue([]),
  };
}

describe('HistoryService ownership and insights', () => {
  let service: HistoryService;
  let builder: ReturnType<typeof queryBuilder>;
  const rideRepository = { findOne: jest.fn(), createQueryBuilder: jest.fn() };
  const driverRepository = { findOne: jest.fn() };
  const analyticsRepository = { findOne: jest.fn() };

  beforeEach(() => {
    jest.resetAllMocks();
    builder = queryBuilder();
    rideRepository.createQueryBuilder.mockReturnValue(builder);
    service = new HistoryService(
      rideRepository as unknown as Repository<Ride>,
      driverRepository as unknown as Repository<Driver>,
      analyticsRepository as unknown as Repository<RideAnalytics>,
    );
  });

  it('scopes rider lists to the current user and binds validated filters and pagination', async () => {
    const query = Object.assign(new RideHistoryQueryDto(), {
      page: 2,
      limit: 10,
      status: RideStatus.COMPLETED,
      category: 'ev',
    });
    await service.listRiderRides('user-1', query);
    expect(builder.where).toHaveBeenCalledWith('ride.riderId = :userId', {
      userId: 'user-1',
    });
    expect(builder.andWhere).toHaveBeenCalledWith('ride.status = :status', {
      status: RideStatus.COMPLETED,
    });
    expect(builder.andWhere).toHaveBeenCalledWith('ride.category = :category', {
      category: 'ev',
    });
    expect(builder.skip).toHaveBeenCalledWith(10);
    expect(builder.take).toHaveBeenCalledWith(10);
    expect(builder.addOrderBy).toHaveBeenCalledWith('ride.id', 'DESC');
  });

  it('maps the authenticated driver user to their DB driver profile', async () => {
    driverRepository.findOne.mockResolvedValue({ id: 'driver-1' });
    await service.listDriverRides('driver-user', new RideHistoryQueryDto());
    expect(driverRepository.findOne).toHaveBeenCalledWith({
      where: { userId: 'driver-user' },
      select: { id: true },
    });
    expect(builder.where).toHaveBeenCalledWith('ride.driverId = :driverId', {
      driverId: 'driver-1',
    });
  });

  it('returns 404 for another rider’s ride and never fetches its analytics', async () => {
    rideRepository.findOne.mockResolvedValue(null);
    await expect(service.getRiderRide('user-1', 'other-ride')).rejects.toThrow(
      NotFoundException,
    );
    expect(rideRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'other-ride', riderId: 'user-1' },
      }),
    );
    expect(analyticsRepository.findOne).not.toHaveBeenCalled();
  });

  it('rejects a missing JWT user id before any database query', async () => {
    await expect(
      service.listRiderRides(
        undefined as unknown as string,
        new RideHistoryQueryDto(),
      ),
    ).rejects.toThrow(UnauthorizedException);
    expect(rideRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('fills empty months and all hours while counting only completed INR payments as spend', async () => {
    jest.useFakeTimers().setSystemTime(Date.parse('2026-10-14T12:00:00Z'));
    try {
      const monthly = queryBuilder();
      const hourly = queryBuilder();
      monthly.getRawMany.mockResolvedValue([
        {
          month: '2026-10',
          completedRides: '2',
          analyzedRides: '1',
          paidRides: '1',
          spend: '90',
          lowDemandSavings: '10',
          evCo2SavedKg: '2.5',
          evRidesWithoutEstimate: '1',
        },
      ]);
      hourly.getRawMany.mockResolvedValue([{ hour: 9, rides: '2' }]);
      rideRepository.createQueryBuilder
        .mockReturnValueOnce(monthly)
        .mockReturnValueOnce(hourly);
      const insights = await service.getRiderInsights('user-1', 2);
      expect(insights.monthly).toHaveLength(2);
      expect(insights.monthly[0]).toEqual(
        expect.objectContaining({ month: '2026-09', spend: 0 }),
      );
      expect(insights.totals).toEqual(
        expect.objectContaining({
          spend: 90,
          completedRides: 2,
          analyzedRides: 1,
          evRidesWithoutEstimate: 1,
        }),
      );
      expect(insights.rideFrequencyByHour).toHaveLength(24);
      expect(insights.rideFrequencyByHour[9]).toEqual({ hour: 9, rides: 2 });
      expect(monthly.where).toHaveBeenCalledWith('ride.riderId = :userId', {
        userId: 'user-1',
      });
      expect(monthly.leftJoin).toHaveBeenCalledWith(
        expect.any(Function),
        'payment',
        expect.any(String),
        { userId: 'user-1', paymentStatus: 'completed', currency: 'INR' },
      );
    } finally {
      jest.useRealTimers();
    }
  });
});
