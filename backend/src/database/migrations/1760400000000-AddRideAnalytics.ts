import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRideAnalytics1760400000000 implements MigrationInterface {
  name = 'AddRideAnalytics1760400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    // The existing database's rides table predates these Ride entity columns.
    // Nullable additions preserve all existing ride rows and support rollback.
    await queryRunner.query(
      'ALTER TABLE "rides" ADD COLUMN IF NOT EXISTS "trip_started_at" timestamp NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "rides" ADD COLUMN IF NOT EXISTS "trip_completed_at" timestamp NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "rides" ADD COLUMN IF NOT EXISTS "actual_distance_km" double precision NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "rides" ADD COLUMN IF NOT EXISTS "actual_duration_min" double precision NULL',
    );
    await queryRunner.query(`
      CREATE TABLE "ride_analytics" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "ride_id" uuid NOT NULL REFERENCES "rides"("id") ON DELETE CASCADE,
        "wait_time_seconds" double precision NULL,
        "fare_accuracy_percent" double precision NULL,
        "fare_error_percent" double precision NULL,
        "co2_saved_kg" double precision NULL,
        "co2_baseline_kg_per_km" double precision NULL,
        "low_demand_savings" double precision NULL,
        "positioning_suggestion_followed" boolean NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "uq_ride_analytics_ride" UNIQUE ("ride_id"),
        CONSTRAINT "chk_ride_analytics_wait" CHECK ("wait_time_seconds" IS NULL OR "wait_time_seconds" >= 0),
        CONSTRAINT "chk_ride_analytics_accuracy" CHECK ("fare_accuracy_percent" IS NULL OR "fare_accuracy_percent" BETWEEN 0 AND 100),
        CONSTRAINT "chk_ride_analytics_co2" CHECK ("co2_saved_kg" IS NULL OR "co2_saved_kg" >= 0),
        CONSTRAINT "chk_ride_analytics_savings" CHECK ("low_demand_savings" IS NULL OR "low_demand_savings" >= 0)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "idx_rides_rider_created" ON "rides" ("rider_id", "createdAt")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_rides_driver_created" ON "rides" ("driver_id", "createdAt")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_rides_rider_completed" ON "rides" ("rider_id", "trip_completed_at")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "idx_rides_rider_completed"');
    await queryRunner.query('DROP INDEX "idx_rides_driver_created"');
    await queryRunner.query('DROP INDEX "idx_rides_rider_created"');
    await queryRunner.query('DROP TABLE "ride_analytics"');
    await queryRunner.query(
      'ALTER TABLE "rides" DROP COLUMN IF EXISTS "actual_duration_min"',
    );
    await queryRunner.query(
      'ALTER TABLE "rides" DROP COLUMN IF EXISTS "actual_distance_km"',
    );
    await queryRunner.query(
      'ALTER TABLE "rides" DROP COLUMN IF EXISTS "trip_completed_at"',
    );
    await queryRunner.query(
      'ALTER TABLE "rides" DROP COLUMN IF EXISTS "trip_started_at"',
    );
  }
}
