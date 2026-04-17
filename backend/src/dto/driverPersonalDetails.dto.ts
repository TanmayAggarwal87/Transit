import { IsEmail, IsString, Length, IsOptional, MinLength, MaxLength } from 'class-validator';
import { IsNull } from 'typeorm/browser';

export class DriverPersonalInfo {
  @IsString()
  @Length(3, 50)
  name!: string;

  @IsString()
  @IsEmail()
  email!: string;

  @IsString()
  @Length(10)

  phone!:string

  @IsString()
  @Length(5, 150)
  address!: string;


  @IsString()
  @IsOptional()
  avatar?: string;

}
