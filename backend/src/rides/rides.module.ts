import { Module } from '@nestjs/common';
import { RidesService } from './rides.service';
import { RidesController } from './rides.controller';
import { PricingService } from './pricing.service';

@Module({
  controllers: [RidesController],
  providers: [RidesService, PricingService],
  exports: [RidesService, PricingService],
})
export class RidesModule {}
