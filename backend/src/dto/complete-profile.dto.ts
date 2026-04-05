import { IsEmail, IsString, Length, IsOptional } from 'class-validator';

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
}
