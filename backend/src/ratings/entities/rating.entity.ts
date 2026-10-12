import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Driver } from '../../drivers/entities/driver.entity';
import { Ride } from '../../rides/entities/ride.entity';
import { User } from '../../users/entities/user.entity';

@Entity('ratings')
@Index('uq_ratings_ride_rater', ['rideId', 'raterUserId'], { unique: true })
@Index('idx_ratings_ratee_user_created_at', ['rateeUserId', 'createdAt'])
@Index('idx_ratings_ratee_driver_created_at', ['rateeDriverId', 'createdAt'])
@Check(
  'chk_ratings_single_ratee',
  '(ratee_user_id IS NOT NULL AND ratee_driver_id IS NULL) OR (ratee_user_id IS NULL AND ratee_driver_id IS NOT NULL)',
)
export class Rating {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'ride_id', type: 'uuid' })
  rideId!: string;

  @ManyToOne(() => Ride, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ride_id' })
  ride!: Ride;

  @Column({ name: 'rater_user_id', type: 'uuid' })
  raterUserId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rater_user_id' })
  rater!: User;

  @Column({ name: 'ratee_user_id', type: 'uuid', nullable: true })
  rateeUserId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ratee_user_id' })
  rateeUser!: User | null;

  @Column({ name: 'ratee_driver_id', type: 'uuid', nullable: true })
  rateeDriverId!: string | null;

  @ManyToOne(() => Driver, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ratee_driver_id' })
  rateeDriver!: Driver | null;

  @Column({ type: 'smallint' })
  score!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
