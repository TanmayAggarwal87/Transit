import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PaymentMethodType {
  CARD = 'card',
  UPI = 'upi',
  WALLET = 'wallet',
  NETBANKING = 'netbanking',
}

@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({
    type: 'varchar',
    length: 20,
    default: PaymentMethodType.CARD,
  })
  type!: PaymentMethodType;

  @Column({ default: 'razorpay' })
  gateway!: string;

  @Column({ name: 'gateway_token' })
  gatewayToken!: string;

  @Column({ nullable: true })
  last4?: string;

  @Column({ nullable: true })
  brand?: string;

  @Column({ name: 'expiry_month', nullable: true })
  expiryMonth?: string;

  @Column({ name: 'expiry_year', nullable: true })
  expiryYear?: string;

  @Column({ name: 'is_default', default: false })
  isDefault!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
