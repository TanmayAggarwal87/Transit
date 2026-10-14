import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Ride } from '../../rides/entities/ride.entity';

@Entity('ride_analytics')
@Unique('uq_ride_analytics_ride', ['rideId'])
@Check(
  'chk_ride_analytics_wait',
  '"wait_time_seconds" IS NULL OR "wait_time_seconds" >= 0',
)
@Check(
  'chk_ride_analytics_accuracy',
  '"fare_accuracy_percent" IS NULL OR "fare_accuracy_percent" BETWEEN 0 AND 100',
)
@Check(
  'chk_ride_analytics_co2',
  '"co2_saved_kg" IS NULL OR "co2_saved_kg" >= 0',
)
@Check(
  'chk_ride_analytics_savings',
  '"low_demand_savings" IS NULL OR "low_demand_savings" >= 0',
)
export class RideAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'ride_id', type: 'uuid' })
  rideId!: string;

  @OneToOne(() => Ride, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ride_id' })
  ride!: Ride;

  @Column({
    name: 'wait_time_seconds',
    type: 'double precision',
    nullable: true,
  })
  waitTimeSeconds!: number | null;

  @Column({
    name: 'fare_accuracy_percent',
    type: 'double precision',
    nullable: true,
  })
  fareAccuracyPercent!: number | null;

  @Column({
    name: 'fare_error_percent',
    type: 'double precision',
    nullable: true,
  })
  fareErrorPercent!: number | null;

  @Column({ name: 'co2_saved_kg', type: 'double precision', nullable: true })
  co2SavedKg!: number | null;

  @Column({
    name: 'co2_baseline_kg_per_km',
    type: 'double precision',
    nullable: true,
  })
  co2BaselineKgPerKm!: number | null;

  @Column({
    name: 'low_demand_savings',
    type: 'double precision',
    nullable: true,
  })
  lowDemandSavings!: number | null;

  // Phase 14 will supply positioning observations. Unknown is distinct from false.
  @Column({
    name: 'positioning_suggestion_followed',
    type: 'boolean',
    nullable: true,
  })
  positioningSuggestionFollowed!: boolean | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
