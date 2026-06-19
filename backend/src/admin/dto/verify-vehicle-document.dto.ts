import { IsEnum } from "class-validator";
import { DocumentStatus } from "src/drivers/entities/driver-document.entity";

export class VerifyVehicleDocuments{
  @IsEnum(DocumentStatus)
  status!: DocumentStatus;
}
