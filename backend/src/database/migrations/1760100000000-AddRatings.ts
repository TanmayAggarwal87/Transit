import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRatings1760100000000 implements MigrationInterface {
  name = 'AddRatings1760100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(
      `ALTER TABLE "users" ADD "rating" numeric(3,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "drivers" ADD "rating" numeric(3,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(`
      CREATE TABLE "ratings" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "ride_id" uuid NOT NULL REFERENCES "rides"("id") ON DELETE CASCADE,
        "rater_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "ratee_user_id" uuid NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "ratee_driver_id" uuid NULL REFERENCES "drivers"("id") ON DELETE CASCADE,
        "score" smallint NOT NULL CHECK ("score" BETWEEN 1 AND 5),
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "uq_ratings_ride_rater" UNIQUE ("ride_id", "rater_user_id"),
        CONSTRAINT "chk_ratings_single_ratee" CHECK (
          ("ratee_user_id" IS NOT NULL AND "ratee_driver_id" IS NULL) OR
          ("ratee_user_id" IS NULL AND "ratee_driver_id" IS NOT NULL)
        )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_ratings_ratee_user_created_at" ON "ratings" ("ratee_user_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ratings_ratee_driver_created_at" ON "ratings" ("ratee_driver_id", "created_at")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "ratings"');
    await queryRunner.query('ALTER TABLE "drivers" DROP COLUMN "rating"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "rating"');
  }
}
