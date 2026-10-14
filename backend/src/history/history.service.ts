import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isISO8601 } from 'class-validator';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Driver } from '../drivers/entities/driver.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { Ride, RideStatus } from '../rides/entities/ride.entity';
import { RideAnalytics } from './entities/ride-analytics.entity';
import { RideHistoryQueryDto } from './dto/ride-history-query.dto';

interface MonthlyInsightsRow {
  month: string;
  completedRides: string;
  analyzedRides: string;
  paidRides: string;
  spend: string;
  lowDemandSavings: string;
  evCo2SavedKg: string;
  evRidesWithoutEstimate: string;
}

function parseDateBound(value: string, isEnd: boolean): Date {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (
    !isISO8601(value, { strict: true }) ||
    (!dateOnly && !/(Z|[+-]\d{2}:?\d{2})$/i.test(value))
  ) {
    throw new BadRequestException(
      'Dates must be YYYY-MM-DD or ISO timestamps with a timezone',
    );
  }
  const date = new Date(dateOnly ? `${value}T00:00:00.000Z` : value);
  if (!Number.isFinite(date.getTime()))
    throw new BadRequestException('Invalid date');
  // An end date includes that entire UTC day; an end timestamp is exclusive.
  if (dateOnly && isEnd) date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

export function getRideHistoryDateBounds(query: RideHistoryQueryDto) {
  let from = query.date_from;
  let to = query.date_to;
  if (query.date_range !== undefined) {
    if (from !== undefined || to !== undefined) {
      throw new BadRequestException(
        'Use date_range or date_from/date_to, not both',
      );
    }
    const parts = query.date_range.split(',').map((part) => part.trim());
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new BadRequestException(
        'date_range must contain two dates separated by a comma',
      );
    }
    [from, to] = parts;
  }
  const dateFrom = from === undefined ? undefined : parseDateBound(from, false);
  const dateTo = to === undefined ? undefined : parseDateBound(to, true);
  if (dateFrom && dateTo && dateFrom >= dateTo) {
    throw new BadRequestException('The start date must precede the end date');
  }
  return { dateFrom, dateTo };
}

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(Ride) private readonly rideRepository: Repository<Ride>,
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    @InjectRepository(RideAnalytics)
    private readonly analyticsRepository: Repository<RideAnalytics>,
  ) {}

  async listRiderRides(userId: string, query: RideHistoryQueryDto) {
    this.assertUserId(userId);
    return this.listRides(
      this.rideRepository
        .createQueryBuilder('ride')
        .where('ride.riderId = :userId', { userId }),
      query,
    );
  }

  async listDriverRides(userId: string, query: RideHistoryQueryDto) {
    this.assertUserId(userId);
    const driver = await this.driverRepository.findOne({
      where: { userId },
      select: { id: true },
    });
    if (!driver) throw new NotFoundException('Driver profile not found');
    return this.listRides(
      this.rideRepository
        .createQueryBuilder('ride')
        .where('ride.driverId = :driverId', { driverId: driver.id }),
      query,
    );
  }

  async getRiderRide(userId: string, rideId: string) {
    this.assertUserId(userId);
    if (!rideId) throw new NotFoundException('Ride not found');
    // Ownership is part of the query; another user's ride is indistinguishable from a missing ride.
    const ride = await this.rideRepository.findOne({
      where: { id: rideId, riderId: userId },
      relations: ['fare', 'statusHistory'],
    });
    if (!ride) throw new NotFoundException('Ride not found');
    const analytics = await this.analyticsRepository.findOne({
      where: { rideId },
    });
    return {
      ...this.serializeRide(ride),
      statusHistory: [...(ride.statusHistory ?? [])]
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((entry) => ({ status: entry.status, createdAt: entry.createdAt })),
      analytics: analytics
        ? {
            waitTimeSeconds: analytics.waitTimeSeconds,
            fareAccuracyPercent: analytics.fareAccuracyPercent,
            fareErrorPercent: analytics.fareErrorPercent,
            co2SavedKg: analytics.co2SavedKg,
            co2BaselineKgPerKm: analytics.co2BaselineKgPerKm,
            lowDemandSavings: analytics.lowDemandSavings,
            positioningSuggestionFollowed:
              analytics.positioningSuggestionFollowed,
          }
        : null,
    };
  }

  async getRiderInsights(userId: string, months = 12) {
    this.assertUserId(userId);
    if (!Number.isInteger(months) || months < 1 || months > 24) {
      throw new BadRequestException('months must be an integer from 1 to 24');
    }
    const now = new Date();
    const from = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months + 1, 1),
    );
    const to = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );
    const completedRides = () =>
      this.rideRepository
        .createQueryBuilder('ride')
        .where('ride.riderId = :userId', { userId })
        .andWhere('ride.status = :status', { status: RideStatus.COMPLETED })
        .andWhere(
          'ride.tripCompletedAt >= :from AND ride.tripCompletedAt < :to',
          { from, to },
        );

    const [monthlyRows, hourlyRows] = await Promise.all([
      completedRides()
        .leftJoin(RideAnalytics, 'analytics', 'analytics.rideId = ride.id')
        .leftJoin(
          Payment,
          'payment',
          'payment.rideId = ride.id AND payment.userId = :userId AND payment.status = :paymentStatus AND payment.currency = :currency',
          { userId, paymentStatus: PaymentStatus.COMPLETED, currency: 'INR' },
        )
        .select("TO_CHAR(ride.tripCompletedAt, 'YYYY-MM')", 'month')
        .addSelect('COUNT(ride.id)', 'completedRides')
        .addSelect('COUNT(analytics.id)', 'analyzedRides')
        .addSelect('COUNT(payment.id)', 'paidRides')
        .addSelect(
          'COALESCE(SUM(CAST(payment.amountPaise AS numeric)), 0) / 100',
          'spend',
        )
        .addSelect(
          'COALESCE(SUM(analytics.lowDemandSavings), 0)',
          'lowDemandSavings',
        )
        .addSelect('COALESCE(SUM(analytics.co2SavedKg), 0)', 'evCo2SavedKg')
        .addSelect(
          "COUNT(*) FILTER (WHERE ride.category = 'ev' AND analytics.co2SavedKg IS NULL)",
          'evRidesWithoutEstimate',
        )
        .groupBy("TO_CHAR(ride.tripCompletedAt, 'YYYY-MM')")
        .orderBy('month', 'ASC')
        .getRawMany<MonthlyInsightsRow>(),
      completedRides()
        .select('EXTRACT(HOUR FROM ride.createdAt)::int', 'hour')
        .addSelect('COUNT(*)', 'rides')
        .groupBy('EXTRACT(HOUR FROM ride.createdAt)::int')
        .orderBy('hour', 'ASC')
        .getRawMany<{ hour: number; rides: string }>(),
    ]);

    const byMonth = new Map(monthlyRows.map((row) => [row.month, row]));
    const monthly = Array.from({ length: months }, (_, index) => {
      const month = new Date(
        Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + index, 1),
      )
        .toISOString()
        .slice(0, 7);
      const row = byMonth.get(month);
      return {
        month,
        completedRides: Number(row?.completedRides ?? 0),
        analyzedRides: Number(row?.analyzedRides ?? 0),
        paidRides: Number(row?.paidRides ?? 0),
        spend: this.round(Number(row?.spend ?? 0), 2),
        lowDemandSavings: this.round(Number(row?.lowDemandSavings ?? 0), 2),
        evCo2SavedKg: this.round(Number(row?.evCo2SavedKg ?? 0), 3),
        evRidesWithoutEstimate: Number(row?.evRidesWithoutEstimate ?? 0),
      };
    });
    const byHour = new Map(
      hourlyRows.map((row) => [Number(row.hour), Number(row.rides)]),
    );
    return {
      currency: 'INR',
      timezone: 'UTC',
      period: { from: from.toISOString(), to: to.toISOString() },
      monthly,
      rideFrequencyByHour: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        rides: byHour.get(hour) ?? 0,
      })),
      totals: {
        completedRides: monthly.reduce(
          (sum, row) => sum + row.completedRides,
          0,
        ),
        analyzedRides: monthly.reduce((sum, row) => sum + row.analyzedRides, 0),
        paidRides: monthly.reduce((sum, row) => sum + row.paidRides, 0),
        spend: this.round(
          monthly.reduce((sum, row) => sum + row.spend, 0),
          2,
        ),
        lowDemandSavings: this.round(
          monthly.reduce((sum, row) => sum + row.lowDemandSavings, 0),
          2,
        ),
        evCo2SavedKg: this.round(
          monthly.reduce((sum, row) => sum + row.evCo2SavedKg, 0),
          3,
        ),
        evRidesWithoutEstimate: monthly.reduce(
          (sum, row) => sum + row.evRidesWithoutEstimate,
          0,
        ),
      },
      co2EstimateBasis:
        'Avoided tailpipe CO2 only; excludes electricity generation and manufacturing',
    };
  }

  private async listRides(
    builder: SelectQueryBuilder<Ride>,
    query: RideHistoryQueryDto,
  ) {
    const { dateFrom, dateTo } = getRideHistoryDateBounds(query);
    if (query.status)
      builder.andWhere('ride.status = :status', { status: query.status });
    if (query.category)
      builder.andWhere('ride.category = :category', {
        category: query.category,
      });
    if (dateFrom) builder.andWhere('ride.createdAt >= :dateFrom', { dateFrom });
    if (dateTo) builder.andWhere('ride.createdAt < :dateTo', { dateTo });
    const [rides, total] = await builder
      .leftJoinAndSelect('ride.fare', 'fare')
      .orderBy('ride.createdAt', 'DESC')
      .addOrderBy('ride.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      items: rides.map((ride) => this.serializeRide(ride)),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  private serializeRide(ride: Ride) {
    const fare = ride.fare;
    return {
      id: ride.id,
      status: ride.status,
      category: ride.category,
      pickup: {
        lat: ride.pickupLat,
        lng: ride.pickupLng,
        address: ride.pickupAddress,
      },
      destination: {
        lat: ride.destLat,
        lng: ride.destLng,
        address: ride.destAddress,
      },
      createdAt: ride.createdAt,
      tripStartedAt: ride.tripStartedAt,
      tripCompletedAt: ride.tripCompletedAt,
      actualDistanceKm: ride.actualDistanceKm,
      actualDurationMin: ride.actualDurationMin,
      fare: fare
        ? {
            currency: 'INR',
            baseFare: fare.baseFare,
            distanceFare: fare.distanceFare,
            durationFare: fare.durationFare,
            surgeMultiplier: fare.surgeMultiplier,
            estimatedTotal: fare.estimatedTotal,
            actualTotal: fare.actualTotal,
          }
        : null,
    };
  }

  private assertUserId(userId: string) {
    if (typeof userId !== 'string' || !userId.trim()) {
      throw new UnauthorizedException('Authenticated user is required');
    }
  }

  private round(value: number, places: number) {
    return Number(value.toFixed(places));
  }
}
