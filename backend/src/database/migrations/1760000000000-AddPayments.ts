import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPayments1760000000000 implements MigrationInterface {
  name = 'AddPayments1760000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(
      `CREATE TYPE "payment_status_enum" AS ENUM ('pending', 'completed', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "driver_earning_status_enum" AS ENUM ('unpaid', 'processing', 'paid')`,
    );
    await queryRunner.query(
      `CREATE TYPE "driver_payout_status_enum" AS ENUM ('processing', 'completed', 'failed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "drivers" ADD "total_earnings" numeric(12,2) NOT NULL DEFAULT 0`,
    );

    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "ride_id" uuid NOT NULL UNIQUE REFERENCES "rides"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "payment_method_id" uuid NULL REFERENCES "payment_methods"("id") ON DELETE SET NULL,
        "gateway" varchar(30) NOT NULL DEFAULT 'razorpay',
        "gateway_order_id" varchar NULL UNIQUE,
        "gateway_payment_id" varchar NULL UNIQUE,
        "amount_paise" bigint NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'INR',
        "status" "payment_status_enum" NOT NULL DEFAULT 'pending',
        "failure_reason" text NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_payments_user_created_at" ON "payments" ("user_id", "created_at" DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE "driver_payouts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "driver_id" uuid NOT NULL REFERENCES "drivers"("id") ON DELETE RESTRICT,
        "bank_account_id" uuid NOT NULL REFERENCES "bank_accounts"("id") ON DELETE RESTRICT,
        "gateway_payout_id" varchar NULL UNIQUE,
        "amount_paise" bigint NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'INR',
        "status" "driver_payout_status_enum" NOT NULL DEFAULT 'processing',
        "failure_reason" text NULL,
        "processed_at" timestamp NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_driver_payouts_driver_created_at" ON "driver_payouts" ("driver_id", "created_at" DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE "driver_earnings" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "ride_id" uuid NOT NULL UNIQUE REFERENCES "rides"("id") ON DELETE RESTRICT,
        "driver_id" uuid NOT NULL REFERENCES "drivers"("id") ON DELETE RESTRICT,
        "payment_id" uuid NOT NULL UNIQUE REFERENCES "payments"("id") ON DELETE RESTRICT,
        "payout_id" uuid NULL REFERENCES "driver_payouts"("id") ON DELETE SET NULL,
        "gross_amount_paise" bigint NOT NULL,
        "commission_amount_paise" bigint NOT NULL,
        "net_amount_paise" bigint NOT NULL,
        "status" "driver_earning_status_enum" NOT NULL DEFAULT 'unpaid',
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_driver_earnings_driver_status_created_at" ON "driver_earnings" ("driver_id", "status", "created_at" DESC)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "driver_earnings"');
    await queryRunner.query('DROP TABLE "driver_payouts"');
    await queryRunner.query('DROP INDEX "idx_payments_user_created_at"');
    await queryRunner.query('DROP TABLE "payments"');
    await queryRunner.query('ALTER TABLE "drivers" DROP COLUMN "total_earnings"');
    await queryRunner.query('DROP TYPE "driver_payout_status_enum"');
    await queryRunner.query('DROP TYPE "driver_earning_status_enum"');
    await queryRunner.query('DROP TYPE "payment_status_enum"');
  }
}
