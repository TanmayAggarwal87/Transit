import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Driver } from './driver.entity';
import { VehicleDocument } from './vehicle-document.entity';

export enum FuelType {
  PETROL = 'petrol',
  DIESEL = 'diesel',
  CNG = 'cng',
  EV = 'ev',
}

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Driver, (driver) => driver.vehicles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'driver_id' })
  driver!: Driver;

  @Column()
  driver_id!: string;

  @Column({ unique: true })
  licensePlate!: string;

  @Column()
  make!: string;

  @Column()
  model!: string;

  @Column({
    type: 'text',
    enum: FuelType,
  })
  fuelType!: FuelType;

  @Column({ default: true })
  isActive!: boolean;

  @OneToMany(() => VehicleDocument, (document) => document.vehicle)
  documents!: VehicleDocument[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}