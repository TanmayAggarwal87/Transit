import { IsString } from "class-validator";

export class VerifyDriverDocuments{
  @IsString()
  status!:string

  @IsString()
  verifiedBy!:string

  @IsString()
  verifiedAt!:string
}