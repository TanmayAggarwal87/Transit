import { Global, Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { KafkaConsumerService } from './kafka-consumer.service';
import { PaymentsService } from './services/payments.service';
import { RideAnalyticsService } from './services/ride-analytics.service';

@Global()
@Module({
  providers: [
    EventsService,
    KafkaConsumerService,
    PaymentsService,
    RideAnalyticsService,
  ],
  exports: [EventsService, PaymentsService, RideAnalyticsService],
})
export class KafkaModule {}
