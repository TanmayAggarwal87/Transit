import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RideStatus } from '../../rides/entities/ride-status.enum';

export class RideHistoryQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsEnum(RideStatus)
  status?: RideStatus;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsIn(['hatchback', 'sedan', 'suv', 'ev'])
  category?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  date_from?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  date_to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  date_range?: string;
}

export class RiderInsightsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  months = 12;
}
