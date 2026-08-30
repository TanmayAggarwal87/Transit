import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Fare } from './fare.entity';
import { RideStatusHistory } from './ride-status-history.entity';

export enum RideStatus {
  REQUESTED = 'requested',
  SEARCHING = 'searching',
  DRIVER_ASSIGNED = 'driver_assigned',
  DRIVER_ARRIVED = 'driver_arrived',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_DRIVERS_FOUND = 'no_drivers_found',
}

@Entity('rides')
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

  @OneToOne(() => Fare, (fare) => fare.ride, { cascade: true })
  fare!: Fare;

  @OneToMany(() => RideStatusHistory, (history) => history.ride, { cascade: true })
  statusHistory!: RideStatusHistory[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
