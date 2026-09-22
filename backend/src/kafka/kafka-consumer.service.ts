import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, Kafka } from 'kafkajs';
import { EventEnvelope, KafkaTopic } from './kafka.constants';
import { PaymentsService } from './services/payments.service';
import { RideAnalyticsService } from './services/ride-analytics.service';

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private kafka: Kafka;
  private consumer: Consumer;
  private isConnected = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly paymentsService: PaymentsService,
    private readonly analyticsService: RideAnalyticsService,
  ) {
    const brokers = (
      this.configService.get<string>('KAFKA_BROKERS') || 'localhost:9092'
    ).split(',');
    const groupId =
      this.configService.get<string>('KAFKA_GROUP_ID') || 'transit-backend-group';

    this.kafka = new Kafka({
      clientId: 'transit-consumer',
      brokers,
    });

    this.consumer = this.kafka.consumer({ groupId });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.consumer.connect();
      this.isConnected = true;

      await this.consumer.subscribe({
        topics: [
          KafkaTopic.RIDE_COMPLETED,
          KafkaTopic.DRIVER_LOCATION_UPDATED,
        ],
        fromBeginning: false,
      });

      await this.consumer.run({
        eachMessage: async ({ topic, message }) => {
          const value = message.value?.toString();
          if (value) {
            await this.handleMessage(topic, value);
          }
        },
      });

      this.logger.log('Kafka consumer connected and subscribed to topics');
    } catch (err: any) {
      this.isConnected = false;
      this.logger.warn(
        `Kafka consumer connection failed: ${err?.message || err}. Message consumption offline.`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.isConnected) {
      try {
        await this.consumer.disconnect();
        this.logger.log('Kafka consumer disconnected');
      } catch (err: any) {
        this.logger.error(`Error disconnecting Kafka consumer: ${err?.message || err}`);
      }
    }
  }

  /**
   * Process incoming Kafka messages based on topic.
   */
  async handleMessage(topic: string, rawMessage: string): Promise<void> {
    try {
      const envelope: EventEnvelope = JSON.parse(rawMessage);
      const data = envelope.data || {};

      switch (topic) {
        case KafkaTopic.RIDE_COMPLETED: {
          const rideId = data.rideId;
          if (rideId) {
            this.logger.log(`[Kafka Consumer] Processing ride completion for ride ${rideId}`);
            await this.paymentsService.processRidePayment(rideId);
            await this.analyticsService.writeAnalytics(rideId);
          }
          break;
        }

        case KafkaTopic.DRIVER_LOCATION_UPDATED: {
          const { driverId, lat, lng, rideId } = data;
          this.logger.log(
            `[Kafka Consumer] Driver ${driverId} location update: (${lat}, ${lng})${rideId ? ` for ride ${rideId}` : ''}`,
          );
          // Phase 6 WebSocket fanout hook:
          if (rideId) {
            this.logger.log(
              `[WebSocket Fanout] Emitting location to room 'ride:${rideId}'`,
            );
          }
          break;
        }

        default:
          this.logger.debug(`Unhandled Kafka topic: ${topic}`);
      }
    } catch (err: any) {
      this.logger.error(
        `Error parsing/handling Kafka message on topic ${topic}: ${err?.message || err}`,
      );
    }
  }
}
