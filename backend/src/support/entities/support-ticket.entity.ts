import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Ride } from '../../rides/entities/ride.entity';

export enum SupportTicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum SupportTicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum SupportTicketCategory {
  RIDE_ISSUE = 'ride_issue',
  FARE_DISPUTE = 'fare_dispute',
  PAYMENT_ISSUE = 'payment_issue',
  LOST_ITEM = 'lost_item',
  SAFETY = 'safety',
  ACCOUNT = 'account',
  GENERAL = 'general',
}

@Entity('support_tickets')
@Index('idx_support_tickets_user_created', ['userId', 'createdAt'])
@Index('idx_support_tickets_status_priority', ['status', 'priority', 'createdAt'])
@Index('idx_support_tickets_ride', ['rideId'])
@Index('uq_support_tickets_ticket_number', ['ticketNumber'], { unique: true })
export class SupportTicket {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'ticket_number', type: 'varchar', length: 32, unique: true })
  ticketNumber!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_role', type: 'varchar', length: 16, default: 'rider' })
  userRole!: 'rider' | 'driver' | 'admin';

  @Column({ name: 'ride_id', type: 'uuid', nullable: true })
  rideId!: string | null;

  @ManyToOne(() => Ride, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ride_id' })
  ride!: Ride | null;

  @Column({
    type: 'enum',
    enum: SupportTicketCategory,
    default: SupportTicketCategory.GENERAL,
  })
  category!: SupportTicketCategory;

  @Column({
    type: 'enum',
    enum: SupportTicketPriority,
    default: SupportTicketPriority.MEDIUM,
  })
  priority!: SupportTicketPriority;

  @Column({
    type: 'enum',
    enum: SupportTicketStatus,
    default: SupportTicketStatus.OPEN,
  })
  status!: SupportTicketStatus;

  @Column({ type: 'varchar', length: 200 })
  subject!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'jsonb', nullable: true })
  attachments!: string[] | null;

  @Column({ name: 'assigned_admin_id', type: 'uuid', nullable: true })
  assignedAdminId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_admin_id' })
  assignedAdmin!: User | null;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes!: string | null;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt!: Date | null;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
