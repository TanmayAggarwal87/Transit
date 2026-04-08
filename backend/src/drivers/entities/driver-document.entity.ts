import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Driver } from './driver.entity';

export enum DriverDocumentType {
  ADDRESS_PROOF = 'address_proof',
  SIGNED_DOCUMENT = 'signed_document',
  CONTRACT = 'contract',
  DRIVING_LICENSE = 'driving_license',
  ID_PROOF = 'id_proof',
}

export enum DocumentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Entity('driver_documents')
export class DriverDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Driver, (driver) => driver.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'driver_id' })
  driver!: Driver;

  @Column()
  driver_id!: string;

  @Column({
    type: 'text',
    enum: DriverDocumentType,
  })
  documentType!: DriverDocumentType;

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