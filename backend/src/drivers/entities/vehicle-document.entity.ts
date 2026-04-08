import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Vehicle } from './vehicle.entity';
import { DocumentStatus } from './driver-document.entity';

export enum VehicleDocumentType {
  RC = 'rc',
  INSURANCE = 'insurance',
  POLLUTION_CERTIFICATE = 'pollution_certificate',
  PERMIT = 'permit',
  FITNESS_CERTIFICATE = 'fitness_certificate',
}

@Entity('vehicle_documents')
export class VehicleDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle;

  @Column()
  vehicle_id!: string;

  @Column({
    type: 'text',
    enum: VehicleDocumentType,
  })
  documentType!: VehicleDocumentType;

  @Column({ type: 'text' })
  filePath!: string;

  @Column({
    type: 'text',
    enum: DocumentStatus,
    default: DocumentStatus.PENDING,
  })
  status!: DocumentStatus;

  @Column({ type: 'date', nullable: true })
  expiresAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}