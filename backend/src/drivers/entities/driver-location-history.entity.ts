import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('driver_location_history')
@Index(['driverId', 'recordedAt'])
export class DriverLocationHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'driver_id', type: 'varchar' })
  driverId!: string;

  @Column({ name: 'ride_id', type: 'varchar', nullable: true })
  rideId!: string | null;

  @Column({ type: 'double precision' })
  lat!: number;

  @Column({ type: 'double precision' })
  lng!: number;

  @Column({ type: 'double precision', nullable: true })
  heading!: number | null;

  @Column({ type: 'double precision', name: 'speed_kmh', nullable: true })
  speedKmh!: number | null;

  @CreateDateColumn({ name: 'recorded_at' })
  recordedAt!: Date;
}
