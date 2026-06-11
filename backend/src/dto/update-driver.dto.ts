import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateDriverProfileDto {
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsDateString()
  licenseExpiry?: string;
}