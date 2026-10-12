import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver } from '../drivers/entities/driver.entity';
import { Ride } from '../rides/entities/ride.entity';
import { Rating } from './entities/rating.entity';
import { RatingsController } from './ratings.controller';
import { RatingsScheduler } from './ratings.scheduler';
import { RatingsService } from './ratings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Rating, Ride, Driver])],
  controllers: [RatingsController],
  providers: [RatingsService, RatingsScheduler],
})
export class RatingsModule {}
