import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum SosAlertStatus {
  OPEN = 'open',
  RESOLVED = 'resolved',
}

@Entity('sos_alerts')
@Index('idx_sos_alerts_ride_created', ['rideId', 'createdAt'])
export class SosAlert {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'ride_id', type: 'uuid' })
  rideId!: string;

  @Column({ name: 'triggered_by_user_id', type: 'uuid' })
  triggeredByUserId!: string;

  @Column({ name: 'triggered_by_role', type: 'varchar', length: 16 })
  triggeredByRole!: 'rider' | 'driver';

  @Column({ type: 'enum', enum: SosAlertStatus, default: SosAlertStatus.OPEN })
  status!: SosAlertStatus;

  @Column({ type: 'double precision', nullable: true })
  lat!: number | null;

  @Column({ type: 'double precision', nullable: true })
  lng!: number | null;

  @Column({ name: 'sms_sent', type: 'boolean', default: false })
  smsSent!: boolean;

  @Column({ name: 'ops_alert_sent', type: 'boolean', default: false })
  opsAlertSent!: boolean;

  @Column({ name: 'resolved_by_user_id', type: 'uuid', nullable: true })
  resolvedByUserId!: string | null;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt!: Date | null;

  @Column({
    name: 'resolution_note',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  resolutionNote!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
