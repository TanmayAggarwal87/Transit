import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Driver } from './driver.entity';

@Entity('bank_accounts')
export class BankAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'driver_id' })
  driverId!: string;

  @ManyToOne(() => Driver, (driver) => driver.bankAccounts, { 
    onDelete: 'CASCADE' 
  })
  @JoinColumn({ name: 'driver_id' })
  driver!: Driver;

  @Column()
  accountNumber!: string;

  @Column()
  accountHolderName!: string;

  @Column()
  ifscCode!: string;

  @Column({ nullable: true })
  bankName?: string;

  @Column({ default: false })
  isVerified!: boolean;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
