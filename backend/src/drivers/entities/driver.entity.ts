import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Vehicle } from './vehicle.entity';
import { DriverDocument } from './driver-document.entity';

export enum DriverOnboardingStatus {
  PENDING = 'pending',
  DOCUMENTS_UPLOADED = 'documents_uploaded',
  VEHICLE_ADDED = 'vehicle_added',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

@Entity('drivers')
export class Driver {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  fullName!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ unique: true })
  phone!: string;

  @Column({ type: 'text' })
  address!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({
    type: 'text',
    enum: DriverOnboardingStatus,
    default: DriverOnboardingStatus.PENDING,
  })
  onboardingStatus!: DriverOnboardingStatus;

  @OneToMany(() => Vehicle, (vehicle) => vehicle.driver)
  vehicles!: Vehicle[];

  @OneToMany(() => DriverDocument, (document) => document.driver)
  documents!: DriverDocument[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}