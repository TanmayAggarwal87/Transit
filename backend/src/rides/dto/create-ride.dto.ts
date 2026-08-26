import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateRideDto {
  @IsNumber()
  @IsNotEmpty()
  pickup_lat!: number;

  @IsNumber()
  @IsNotEmpty()
  pickup_lng!: number;

  @IsOptional()
  @IsString()
  pickup_address?: string;

  @IsNumber()
  @IsNotEmpty()
  dest_lat!: number;

  @IsNumber()
  @IsNotEmpty()
  dest_lng!: number;

  @IsOptional()
  @IsString()
  dest_address?: string;

  @IsString()
  @IsNotEmpty()
  category!: string;
}
