import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupportTickets1760500000000 implements MigrationInterface {
  name = 'AddSupportTickets1760500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(`
      CREATE TYPE "support_tickets_status_enum" AS ENUM ('open', 'in_progress', 'resolved', 'closed')
    `);
    await queryRunner.query(`
      CREATE TYPE "support_tickets_priority_enum" AS ENUM ('low', 'medium', 'high', 'urgent')
    `);
    await queryRunner.query(`
      CREATE TYPE "support_tickets_category_enum" AS ENUM (
        'ride_issue',
        'fare_dispute',
        'payment_issue',
        'lost_item',
        'safety',
        'account',
        'general'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "support_tickets" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "ticket_number" varchar(32) NOT NULL,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "user_role" varchar(16) NOT NULL DEFAULT 'rider',
        "ride_id" uuid NULL REFERENCES "rides"("id") ON DELETE SET NULL,
        "category" "support_tickets_category_enum" NOT NULL DEFAULT 'general',
        "priority" "support_tickets_priority_enum" NOT NULL DEFAULT 'medium',
        "status" "support_tickets_status_enum" NOT NULL DEFAULT 'open',
        "subject" varchar(200) NOT NULL,
        "description" text NOT NULL,
        "attachments" jsonb NULL,
        "assigned_admin_id" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "resolution_notes" text NULL,
        "resolved_at" timestamp NULL,
        "closed_at" timestamp NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "uq_support_tickets_ticket_number" UNIQUE ("ticket_number")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_support_tickets_user_created" ON "support_tickets" ("user_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_support_tickets_status_priority" ON "support_tickets" ("status", "priority", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_support_tickets_ride" ON "support_tickets" ("ride_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "support_tickets"');
    await queryRunner.query('DROP TYPE IF EXISTS "support_tickets_category_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "support_tickets_priority_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "support_tickets_status_enum"');
  }
}
