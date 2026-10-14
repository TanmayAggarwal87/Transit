import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSafetySosAlerts1760300000000 implements MigrationInterface {
  name = 'AddSafetySosAlerts1760300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "sos_alerts_status_enum" AS ENUM ('open', 'resolved')
    `);
    await queryRunner.query(`
      CREATE TABLE "sos_alerts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "ride_id" uuid NOT NULL REFERENCES "rides"("id") ON DELETE CASCADE,
        "triggered_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "triggered_by_role" varchar(16) NOT NULL CHECK ("triggered_by_role" IN ('rider', 'driver')),
        "status" "sos_alerts_status_enum" NOT NULL DEFAULT 'open',
        "lat" double precision NULL,
        "lng" double precision NULL,
        "sms_sent" boolean NOT NULL DEFAULT false,
        "ops_alert_sent" boolean NOT NULL DEFAULT false,
        "resolved_by_user_id" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "resolved_at" timestamp NULL,
        "resolution_note" varchar(500) NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "chk_sos_alert_location_pair" CHECK (("lat" IS NULL) = ("lng" IS NULL))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_sos_alerts_ride_created" ON "sos_alerts" ("ride_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_sos_alerts_open_ride_actor" ON "sos_alerts" ("ride_id", "triggered_by_user_id") WHERE "status" = 'open'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "sos_alerts"');
    await queryRunner.query('DROP TYPE "sos_alerts_status_enum"');
  }
}
