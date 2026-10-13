import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotifications1760200000000 implements MigrationInterface {
  name = 'AddNotifications1760200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(`
      CREATE TABLE "in_app_notifications" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "type" varchar(80) NOT NULL,
        "title" varchar(160) NOT NULL,
        "body" text NOT NULL,
        "deep_link" varchar(512) NULL,
        "data" jsonb NULL,
        "is_read" boolean NOT NULL DEFAULT false,
        "read_at" timestamp NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_in_app_notifications_user_created" ON "in_app_notifications" ("user_id", "created_at")`,
    );
    await queryRunner.query(`
      CREATE TABLE "device_tokens" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token" varchar(4096) NOT NULL,
        "platform" varchar(16) NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "uq_device_tokens_token" UNIQUE ("token")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "device_tokens"');
    await queryRunner.query('DROP INDEX "idx_in_app_notifications_user_created"');
    await queryRunner.query('DROP TABLE "in_app_notifications"');
  }
}
