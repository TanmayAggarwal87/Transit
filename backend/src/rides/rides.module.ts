import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RidesService } from './rides.service';
import { RidesController } from './rides.controller';
import { PricingService } from './pricing.service';
import { Ride } from './entities/ride.entity';
import { Fare } from './entities/fare.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ride, Fare])],
  controllers: [RidesController],
  providers: [RidesService, PricingService],
  exports: [RidesService, PricingService],
})
export class RidesModule {}
