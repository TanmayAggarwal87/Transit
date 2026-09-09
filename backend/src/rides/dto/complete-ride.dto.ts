import { IsNumber, IsOptional } from 'class-validator';

export class CompleteRideDto {
  @IsOptional()
  @IsNumber()
  actual_distance_km?: number;

  @IsOptional()
  @IsNumber()
  actual_duration_min?: number;

  @IsOptional()
  @IsNumber()
  dest_lat?: number;

  @IsOptional()
  @IsNumber()
  dest_lng?: number;
}
