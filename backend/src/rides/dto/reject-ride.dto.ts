import { IsOptional, IsString } from 'class-validator';

export class RejectRideDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
