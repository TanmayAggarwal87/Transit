import { IsEmail, IsString, Length, IsOptional, MinLength, MaxLength } from 'class-validator';
import { IsNull } from 'typeorm/browser';

export class CompleteProfileDto {
  @IsString()
  @Length(3, 50)
  name: string;

  @IsString()
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsString()
  @IsOptional()
  @MinLength(10)
  @MaxLength(10)
  emergencyContact?:string
}
