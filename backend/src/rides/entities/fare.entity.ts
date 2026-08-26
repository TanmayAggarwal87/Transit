import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Ride } from './ride.entity';

@Entity('fares')
export class Fare {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', name: 'ride_id' })
  rideId!: string;

  @OneToOne(() => Ride, (ride) => ride.fare, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ride_id' })
  ride!: Ride;

  @Column({ type: 'double precision', name: 'base_fare' })
  baseFare!: number;

  @Column({ type: 'double precision', name: 'distance_fare' })
  distanceFare!: number;

  @Column({ type: 'double precision', name: 'duration_fare' })
  durationFare!: number;

  @Column({ type: 'double precision', name: 'surge_multiplier', default: 1.0 })
  surgeMultiplier!: number;

  @Column({ type: 'double precision', name: 'estimated_total' })
  estimatedTotal!: number;

  @Column({ type: 'double precision', name: 'actual_total', nullable: true })
  actualTotal!: number | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
