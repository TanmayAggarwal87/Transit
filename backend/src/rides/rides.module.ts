import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RidesService } from './rides.service';
import { RidesController } from './rides.controller';
import { PricingService } from './pricing.service';
import { MatchingService } from './matching.service';
import { Ride } from './entities/ride.entity';
import { Fare } from './entities/fare.entity';
import { RideStatusHistory } from './entities/ride-status-history.entity';
import { Driver } from 'src/drivers/entities/driver.entity';
import { DriversModule } from 'src/drivers/drivers.module';
import { RealtimeModule } from 'src/realtime/realtime.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ride, Fare, RideStatusHistory, Driver]),
    DriversModule,
    forwardRef(() => RealtimeModule),
    NotificationsModule,
  ],
  controllers: [RidesController],
  providers: [RidesService, PricingService, MatchingService],
  exports: [RidesService, PricingService, MatchingService],
})
export class RidesModule {}
