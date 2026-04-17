import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  Length,
  Matches,
} from 'class-validator';

export class DriverPersonalInfo {
  @IsString()
  @IsNotEmpty()
  @Length(5, 20)
  licenseNumber!: string;

  @IsDateString()
  licenseExpiry!: string;

  @IsString()
  @Matches(/^[0-9]{12}$/, { message: 'Aadhaar must be 12 digits' })
  aadhaarNumber!: string;

  @IsString()
  @IsOptional()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, { message: 'Invalid PAN format' })
  panNumber?: string;

  @IsString()
  @Length(10, 200)
  address!: string;
}