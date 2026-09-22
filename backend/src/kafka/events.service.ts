import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Partitioners, Producer } from 'kafkajs';
import { randomUUID } from 'crypto';
import { EventEnvelope, KafkaTopic } from './kafka.constants';

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);
  private kafka: Kafka;
  private producer: Producer;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {
    const brokers = (
      this.configService.get<string>('KAFKA_BROKERS') || 'localhost:9092'
    ).split(',');
    const clientId =
      this.configService.get<string>('KAFKA_CLIENT_ID') || 'transit-backend';

    this.kafka = new Kafka({
      clientId,
      brokers,
    });

    this.producer = this.kafka.producer({
      createPartitioner: Partitioners.DefaultPartitioner,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.producer.connect();
      this.isConnected = true;
      this.logger.log('Kafka producer connected successfully');
    } catch (err: any) {
      this.isConnected = false;
      this.logger.warn(
        `Kafka producer connection failed: ${err?.message || err}. Events will be logged.`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.isConnected) {
      try {
        await this.producer.disconnect();
        this.logger.log('Kafka producer disconnected');
      } catch (err: any) {
        this.logger.error(`Error disconnecting Kafka producer: ${err?.message || err}`);
      }
    }
  }

  /**
   * Emit an event to a Kafka topic wrapped in a structured envelope.
   * Envelope format: { eventId, timestamp, topic, data }
   */
  async emit<T = any>(
    topic: KafkaTopic | string,
    payload: T,
  ): Promise<EventEnvelope<T>> {
    const envelope: EventEnvelope<T> = {
      eventId: randomUUID(),
      timestamp: new Date().toISOString(),
      topic,
      data: payload,
    };

    try {
      if (this.isConnected) {
        await this.producer.send({
          topic,
          messages: [
            {
              key: (payload as any)?.rideId || (payload as any)?.driverId || envelope.eventId,
              value: JSON.stringify(envelope),
            },
          ],
        });
        this.logger.log(`[Kafka Event Emitted] ${topic} -> ${envelope.eventId}`);
      } else {
        this.logger.log(
          `[Kafka Event (Offline/Mock)] ${topic} -> ${JSON.stringify(envelope)}`,
        );
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to emit Kafka event to topic '${topic}': ${err?.message || err}`,
      );
    }

    return envelope;
  }
}
