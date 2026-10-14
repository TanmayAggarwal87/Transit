import { Global, Module } from '@nestjs/common';
import { EventsModule } from './events.module';
import { KafkaConsumerService } from './kafka-consumer.service';
import { RideAnalyticsService } from './services/ride-analytics.service';
import { PaymentsModule } from '../payments/payments.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ride } from '../rides/entities/ride.entity';
import { RideAnalytics } from '../history/entities/ride-analytics.entity';
import { RideAnalyticsScheduler } from './services/ride-analytics.scheduler';

@Global()
@Module({
  imports: [
    EventsModule,
    PaymentsModule,
    TypeOrmModule.forFeature([Ride, RideAnalytics]),
  ],
  providers: [
    KafkaConsumerService,
    RideAnalyticsService,
    RideAnalyticsScheduler,
  ],
  exports: [EventsModule, RideAnalyticsService],
})
export class KafkaModule {}
