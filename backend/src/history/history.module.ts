import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Driver } from '../drivers/entities/driver.entity';
import { Ride } from '../rides/entities/ride.entity';
import { RideAnalytics } from './entities/ride-analytics.entity';
import {
  DriverHistoryController,
  RiderHistoryController,
} from './history.controller';
import { HistoryService } from './history.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ride, Driver, RideAnalytics]),
    AuthModule,
  ],
  controllers: [RiderHistoryController, DriverHistoryController],
  providers: [HistoryService],
})
export class HistoryModule {}
