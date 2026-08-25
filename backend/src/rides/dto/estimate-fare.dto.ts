import { IsNotEmpty, IsNumber } from 'class-validator';

export class EstimateFareDto {
  @IsNumber()
  @IsNotEmpty()
  pickup_lat!: number;

  @IsNumber()
  @IsNotEmpty()
  pickup_lng!: number;

  @IsNumber()
  @IsNotEmpty()
  dest_lat!: number;

  @IsNumber()
  @IsNotEmpty()
  dest_lng!: number;
}
