import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { Fare } from './fare.entity';
import { RideStatusHistory } from './ride-status-history.entity';
import { RideStatus } from './ride-status.enum';

export { RideStatus } from './ride-status.enum';

@Entity('rides')
@Index('idx_rides_rider_created', ['riderId', 'createdAt'])
@Index('idx_rides_driver_created', ['driverId', 'createdAt'])
@Index('idx_rides_rider_completed', ['riderId', 'tripCompletedAt'])
export class Ride {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', name: 'rider_id' })
  riderId!: string;

  @Column({ type: 'varchar', name: 'driver_id', nullable: true })
  driverId!: string | null;

  @Column({ type: 'double precision', name: 'pickup_lat' })
  pickupLat!: number;

  @Column({ type: 'double precision', name: 'pickup_lng' })
  pickupLng!: number;

  @Column({ type: 'varchar', name: 'pickup_address', nullable: true })
  pickupAddress!: string | null;

  @Column({ type: 'double precision', name: 'dest_lat' })
  destLat!: number;

  @Column({ type: 'double precision', name: 'dest_lng' })
  destLng!: number;

  @Column({ type: 'varchar', name: 'dest_address', nullable: true })
  destAddress!: string | null;

  @Column({ type: 'varchar', default: 'hatchback' })
  category!: string;

  @Column({
    type: 'enum',
    enum: RideStatus,
    default: RideStatus.REQUESTED,
  })
  status!: RideStatus;

  @Column({ type: 'timestamp', name: 'trip_started_at', nullable: true })
  tripStartedAt!: Date | null;

  @Column({ type: 'timestamp', name: 'trip_completed_at', nullable: true })
  tripCompletedAt!: Date | null;

  @Column({
    type: 'double precision',
    name: 'actual_distance_km',
    nullable: true,
  })
  actualDistanceKm!: number | null;

  @Column({
    type: 'double precision',
    name: 'actual_duration_min',
    nullable: true,
  })
  actualDurationMin!: number | null;

  @OneToOne(() => Fare, (fare) => fare.ride, { cascade: true })
  fare!: Fare;

  @OneToMany(() => RideStatusHistory, (history) => history.ride, {
    cascade: true,
  })
  statusHistory!: RideStatusHistory[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
