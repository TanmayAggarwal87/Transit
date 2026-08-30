import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Ride, RideStatus } from './ride.entity';

@Entity('ride_status_history')
export class RideStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', name: 'ride_id' })
  rideId!: string;

  @ManyToOne(() => Ride, (ride) => ride.statusHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ride_id' })
  ride!: Ride;

  @Column({
    type: 'enum',
    enum: RideStatus,
  })
  status!: RideStatus;

  @Column({ type: 'varchar', name: 'changed_by', nullable: true })
  changedBy!: string | null;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
