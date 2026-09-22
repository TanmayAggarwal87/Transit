import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateDriverLocationDto {
  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;

  @IsOptional()
  @IsNumber()
  heading?: number;

  @IsOptional()
  @IsNumber()
  speed_kmh?: number;

  @IsOptional()
  @IsString()
  ride_id?: string;
}
