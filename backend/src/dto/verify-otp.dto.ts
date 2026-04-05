import { IsString, IsNumberString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @IsNumberString()
  @Length(10, 10)
  phone: string;

  @IsString()
  @Length(4, 6)
  otp: string;
}
