import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Vehicle } from './vehicle.entity';
import { DriverDocument } from './driver-document.entity';
import { BankAccount } from './bank-account.entity';
import { User } from 'src/users/entities/user.entity';

export enum DriverOnboardingStatus {
  PENDING = 'pending',
  DOCUMENTS_UPLOADED = 'documents_uploaded',
  VEHICLE_ADDED = 'vehicle_added',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}
export enum DriverStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  ON_RIDE = 'on_ride',
  BREAK = 'break',
}

@Entity('drivers')
export class Driver {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'text' })
  address!: string;

  @Column({
    type: 'enum',
    enum: DriverStatus,
    default: DriverStatus.OFFLINE,
  })
  status!: DriverStatus;

  @Column({ name: 'license_number', unique: true })
  licenseNumber!: string;

  @Column({ name: 'license_expiry', type: 'date' })
  licenseExpiry!: Date;

  @Column({ name: 'aadhaar_number', unique: true, nullable: true })
  aadhaarNumber!: string;

  @Column({ name: 'pan_number', nullable: true })
  panNumber!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({
    type: 'enum',
    enum: DriverOnboardingStatus,
    default: DriverOnboardingStatus.PENDING,
  })
  onboardingStatus!: DriverOnboardingStatus;

  @Column({ type: 'double precision', name: 'current_lat', nullable: true })
  currentLat!: number | null;

  @Column({ type: 'double precision', name: 'current_lng', nullable: true })
  currentLng!: number | null;

  @Column({ type: 'timestamp', name: 'last_location_update', nullable: true })
  lastLocationUpdate!: Date | null;

  @OneToMany(() => Vehicle, (vehicle) => vehicle.driver)
  vehicles!: Vehicle[];

  @OneToMany(() => DriverDocument, (document) => document.driver)
  documents!: DriverDocument[];

  @OneToMany(() => BankAccount, (bankAccount) => bankAccount.driver)
  bankAccounts!: BankAccount[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
