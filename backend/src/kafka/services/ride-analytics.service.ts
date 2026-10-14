import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RideAnalytics } from '../../history/entities/ride-analytics.entity';
import { Ride, RideStatus } from '../../rides/entities/ride.entity';

// EPA's approximate passenger-vehicle tailpipe baseline: 400 g/mile.
// This is an estimate, not a lifecycle or India-specific emissions claim.
const DEFAULT_CO2_BASELINE_KG_PER_KM = 0.4 / 1.609344;

const nonnegative = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;
const rounded = (value: number, places: number) =>
  Number.isFinite(value) ? Number(value.toFixed(places)) : null;

export function calculateRideMetrics(ride: Ride, co2Baseline: number | null) {
  const arrivalTimes = (ride.statusHistory ?? [])
    .filter((entry) => entry.status === RideStatus.DRIVER_ARRIVED)
    .map((entry) => new Date(entry.createdAt).getTime())
    .filter(Number.isFinite);
  const waitEnd =
    arrivalTimes.length > 0
      ? Math.min(...arrivalTimes)
      : ride.tripStartedAt
        ? new Date(ride.tripStartedAt).getTime()
        : NaN;
  const waitStart = new Date(ride.createdAt).getTime();
  const waitSeconds = (waitEnd - waitStart) / 1000;
  const waitTimeSeconds = nonnegative(waitSeconds)
    ? rounded(waitSeconds, 1)
    : null;

  const fare = ride.fare;
  const estimated = fare?.estimatedTotal;
  const actual = fare?.actualTotal;
  const fareErrorPercent =
    nonnegative(estimated) && estimated > 0 && nonnegative(actual)
      ? rounded(((actual - estimated) / estimated) * 100, 2)
      : null;
  const fareAccuracyPercent =
    fareErrorPercent === null
      ? null
      : rounded(Math.max(0, 100 - Math.abs(fareErrorPercent)), 2);

  let lowDemandSavings: number | null = null;
  if (
    fare &&
    nonnegative(actual) &&
    [fare.baseFare, fare.distanceFare, fare.durationFare].every(nonnegative)
  ) {
    const withoutSurge = fare.baseFare + fare.distanceFare + fare.durationFare;
    lowDemandSavings =
      Number.isFinite(fare.surgeMultiplier) && fare.surgeMultiplier > 0
        ? fare.surgeMultiplier < 1
          ? rounded(Math.max(0, withoutSurge - actual), 2)
          : 0
        : null;
  }

  const isEv = ride.category.toLowerCase() === 'ev';
  const co2SavedKg = !isEv
    ? 0
    : nonnegative(ride.actualDistanceKm) && co2Baseline !== null
      ? rounded(ride.actualDistanceKm * co2Baseline, 3)
      : null;

  return {
    rideId: ride.id,
    waitTimeSeconds,
    fareAccuracyPercent,
    fareErrorPercent,
    lowDemandSavings,
    co2SavedKg,
    co2BaselineKgPerKm: isEv ? co2Baseline : null,
  };
}

@Injectable()
export class RideAnalyticsService {
  private readonly logger = new Logger(RideAnalyticsService.name);
  private readonly co2Baseline: number | null;

  constructor(
    @InjectRepository(Ride) private readonly rideRepository: Repository<Ride>,
    @InjectRepository(RideAnalytics)
    private readonly analyticsRepository: Repository<RideAnalytics>,
    configService: ConfigService,
  ) {
    const configured = configService.get<string>(
      'ANALYTICS_BASELINE_CO2_KG_PER_KM',
    );
    const baseline =
      configured === undefined || configured.trim() === ''
        ? DEFAULT_CO2_BASELINE_KG_PER_KM
        : Number(configured);
    this.co2Baseline =
      Number.isFinite(baseline) && baseline > 0 ? baseline : null;
    if (this.co2Baseline === null) {
      this.logger.warn(
        'Invalid ANALYTICS_BASELINE_CO2_KG_PER_KM; EV CO2 estimates will be unavailable',
      );
    }
  }

  /**
   * Use persisted ride data, not untrusted event amounts. The unique ride key
   * makes Kafka redelivery and catch-up jobs safe; no existing positioning
   * observation is overwritten when the future Phase 14 producer supplies it.
   */
  async writeAnalytics(
    rideId: string,
  ): Promise<{ success: boolean; rideId: string }> {
    if (typeof rideId !== 'string' || !rideId.trim())
      return { success: false, rideId };
    const ride = await this.rideRepository.findOne({
      where: { id: rideId },
      relations: ['fare', 'statusHistory'],
    });
    if (!ride || ride.status !== RideStatus.COMPLETED) {
      return { success: false, rideId };
    }
    await this.analyticsRepository.upsert(
      calculateRideMetrics(ride, this.co2Baseline),
      {
        conflictPaths: ['rideId'],
        skipUpdateIfNoValuesChanged: true,
      },
    );
    return { success: true, rideId };
  }

  async backfillMissingAnalytics(): Promise<void> {
    const rides = await this.rideRepository
      .createQueryBuilder('ride')
      .leftJoin(RideAnalytics, 'analytics', 'analytics.rideId = ride.id')
      .where('ride.status = :status', { status: RideStatus.COMPLETED })
      .andWhere('analytics.id IS NULL')
      // TypeORM's joined pagination needs every ORDER BY column in the select.
      .select(['ride.id', 'ride.tripCompletedAt'])
      .orderBy('ride.tripCompletedAt', 'ASC')
      .addOrderBy('ride.id', 'ASC')
      .take(100)
      .getMany();
    for (const ride of rides) {
      try {
        await this.writeAnalytics(ride.id);
      } catch (error) {
        this.logger.error(
          `Analytics catch-up failed for ride ${ride.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
