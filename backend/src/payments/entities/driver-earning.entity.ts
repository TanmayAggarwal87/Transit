import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Ride } from '../../rides/entities/ride.entity';
import { Driver } from '../../drivers/entities/driver.entity';
import { DriverPayout } from './driver-payout.entity';
import { Payment } from './payment.entity';

export enum DriverEarningStatus {
  UNPAID = 'unpaid',
  PROCESSING = 'processing',
  PAID = 'paid',
}

@Entity('driver_earnings')
export class DriverEarning {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'ride_id', type: 'uuid' })
  rideId!: string;

  @ManyToOne(() => Ride, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ride_id' })
  ride!: Ride;

  @Column({ name: 'driver_id', type: 'uuid' })
  driverId!: string;

  @ManyToOne(() => Driver, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'driver_id' })
  driver!: Driver;

  @Column({ name: 'payment_id', type: 'uuid' })
  paymentId!: string;

  @OneToOne(() => Payment, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'payment_id' })
  payment!: Payment;

  @Column({ name: 'payout_id', type: 'uuid', nullable: true })
  payoutId!: string | null;

  @ManyToOne(() => DriverPayout, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'payout_id' })
  payout!: DriverPayout | null;

  @Column({ name: 'gross_amount_paise', type: 'bigint' })
  grossAmountPaise!: string;

  @Column({ name: 'commission_amount_paise', type: 'bigint' })
  commissionAmountPaise!: string;

  @Column({ name: 'net_amount_paise', type: 'bigint' })
  netAmountPaise!: string;

  @Column({
    type: 'enum',
    enum: DriverEarningStatus,
    enumName: 'driver_earning_status_enum',
    default: DriverEarningStatus.UNPAID,
  })
  status!: DriverEarningStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
