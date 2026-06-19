import {
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';
import { DriverDocumentType } from '../entities/driver-document.entity';

/**
 * DTO for uploading driver documents
 * Note: expiresAt is optional because some documents (PAN) don't have expiration dates
 */
export class UploadDocumentDto {
  @IsEnum(DriverDocumentType)
  documentType!: DriverDocumentType;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
