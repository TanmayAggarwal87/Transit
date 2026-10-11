import { Global, Module } from '@nestjs/common';
import { EventsModule } from './events.module';
import { KafkaConsumerService } from './kafka-consumer.service';
import { RideAnalyticsService } from './services/ride-analytics.service';
import { PaymentsModule } from '../payments/payments.module';

@Global()
@Module({
  imports: [EventsModule, PaymentsModule],
  providers: [
    KafkaConsumerService,
    RideAnalyticsService,
  ],
  exports: [EventsModule, RideAnalyticsService],
})
export class KafkaModule {}
