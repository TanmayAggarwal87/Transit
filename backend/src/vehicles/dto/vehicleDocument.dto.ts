import {
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';
import { VehicleDocumentType } from 'src/drivers/entities/vehicle-document.entity';


/**
 * DTO for uploading vehicle documents
 */
export class VehicleDocumentDto {
  @IsEnum(VehicleDocumentType)
  documentType!: VehicleDocumentType;

  @IsOptional()
  @IsDateString()
  expiresAt!: string;
}
