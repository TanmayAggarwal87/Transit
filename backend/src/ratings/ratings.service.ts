import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Driver } from '../drivers/entities/driver.entity';
import { Ride, RideStatus } from '../rides/entities/ride.entity';
import { Rating } from './entities/rating.entity';

interface RatingActor {
  userId: string;
}

@Injectable()
export class RatingsService {
  private readonly logger = new Logger(RatingsService.name);

  constructor(
    @InjectRepository(Rating)
    private readonly ratingRepository: Repository<Rating>,
    @InjectRepository(Ride)
    private readonly rideRepository: Repository<Ride>,
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
  ) {}

  async submitRating(
    rideId: string,
    actor: RatingActor,
    score: number,
  ): Promise<Rating> {
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      throw new BadRequestException('Rating score must be an integer from 1 to 5');
    }

    const ride = await this.rideRepository.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.status !== RideStatus.COMPLETED) {
      throw new BadRequestException('Only completed rides can be rated');
    }
    if (!ride.driverId) {
      throw new BadRequestException('Ride has no assigned driver to rate');
    }

    const driver = await this.driverRepository.findOne({
      where: { id: ride.driverId },
      select: { id: true, userId: true },
    });
    if (!driver) throw new NotFoundException('Assigned driver not found');

    let rateeUserId: string | null = null;
    let rateeDriverId: string | null = null;
    if (actor.userId === ride.riderId) {
      rateeDriverId = driver.id;
    } else if (actor.userId === driver.userId) {
      rateeUserId = ride.riderId;
    } else {
      throw new BadRequestException('Only ride participants can submit a rating');
    }

    try {
      const rating = await this.ratingRepository.save(
        this.ratingRepository.create({
          rideId,
          raterUserId: actor.userId,
          rateeUserId,
          rateeDriverId,
          score,
        }),
      );

      // The scheduled refresh is the durable catch-up path if this update fails.
      void this.recomputeRatee(rateeUserId, rateeDriverId).catch((error: unknown) => {
        this.logger.error(
          `Could not refresh rating aggregate after rating ${rating.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      });

      return rating;
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as QueryFailedError & { driverError?: { code?: string } }).driverError
          ?.code === '23505'
      ) {
        throw new ConflictException('You have already rated this ride');
      }
      throw error;
    }
  }

  async getDriverRating(driverId: string) {
    const driver = await this.driverRepository.findOne({
      where: { id: driverId },
      select: { id: true, rating: true },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const result = await this.ratingRepository
      .createQueryBuilder('rating')
      .select('COUNT(*)', 'count')
      .addSelect('AVG(rating.score)', 'average')
      .where('rating.rateeDriverId = :driverId', { driverId })
      .andWhere("rating.createdAt >= NOW() - INTERVAL '90 days'")
      .getRawOne<{ count: string; average: string | null }>();

    return {
      driverId: driver.id,
      rating: driver.rating,
      ratingCount: Number(result?.count ?? 0),
    };
  }

  async recomputeRatee(
    rateeUserId: string | null,
    rateeDriverId: string | null,
  ): Promise<void> {
    if (rateeUserId) {
      await this.ratingRepository.query(
        `UPDATE "users" AS target
         SET "rating" = COALESCE((
           SELECT ROUND(AVG(source."score")::numeric, 2)
           FROM "ratings" AS source
           WHERE source."ratee_user_id" = target."id"
             AND source."created_at" >= NOW() - INTERVAL '90 days'
         ), 0)
         WHERE target."id" = $1`,
        [rateeUserId],
      );
    }

    if (rateeDriverId) {
      await this.ratingRepository.query(
        `UPDATE "drivers" AS target
         SET "rating" = COALESCE((
           SELECT ROUND(AVG(source."score")::numeric, 2)
           FROM "ratings" AS source
           WHERE source."ratee_driver_id" = target."id"
             AND source."created_at" >= NOW() - INTERVAL '90 days'
         ), 0)
         WHERE target."id" = $1`,
        [rateeDriverId],
      );
    }
  }

  async recomputeAllRatings(): Promise<void> {
    await this.ratingRepository.query(
      `UPDATE "users" AS target
       SET "rating" = COALESCE((
         SELECT ROUND(AVG(source."score")::numeric, 2)
         FROM "ratings" AS source
         WHERE source."ratee_user_id" = target."id"
           AND source."created_at" >= NOW() - INTERVAL '90 days'
       ), 0)
       WHERE target."id" IN (
         SELECT DISTINCT "ratee_user_id" FROM "ratings"
         WHERE "ratee_user_id" IS NOT NULL
       )`,
    );
    await this.ratingRepository.query(
      `UPDATE "drivers" AS target
       SET "rating" = COALESCE((
         SELECT ROUND(AVG(source."score")::numeric, 2)
         FROM "ratings" AS source
         WHERE source."ratee_driver_id" = target."id"
           AND source."created_at" >= NOW() - INTERVAL '90 days'
       ), 0)
       WHERE target."id" IN (
         SELECT DISTINCT "ratee_driver_id" FROM "ratings"
         WHERE "ratee_driver_id" IS NOT NULL
       )`,
    );
  }
}
