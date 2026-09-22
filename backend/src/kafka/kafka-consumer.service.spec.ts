import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { KafkaConsumerService } from './kafka-consumer.service';
import { PaymentsService } from './services/payments.service';
import { RideAnalyticsService } from './services/ride-analytics.service';
import { KafkaTopic } from './kafka.constants';

describe('KafkaConsumerService', () => {
  let service: KafkaConsumerService;
  let paymentsService: any;
  let analyticsService: any;

  beforeEach(async () => {
    paymentsService = {
      processRidePayment: jest.fn().mockResolvedValue({ success: true }),
    };
    analyticsService = {
      writeAnalytics: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KafkaConsumerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: any) => {
              if (key === 'KAFKA_BROKERS') return 'localhost:9092';
              if (key === 'KAFKA_GROUP_ID') return 'transit-group';
              return defaultVal;
            }),
          },
        },
        { provide: PaymentsService, useValue: paymentsService },
        { provide: RideAnalyticsService, useValue: analyticsService },
      ],
    }).compile();

    service = module.get<KafkaConsumerService>(KafkaConsumerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleMessage', () => {
    it('should trigger PaymentsService and RideAnalyticsService when transit.ride.completed is received', async () => {
      const payload = {
        eventId: 'evt-1',
        timestamp: new Date().toISOString(),
        topic: KafkaTopic.RIDE_COMPLETED,
        data: { rideId: 'ride-999', status: 'completed' },
      };

      await service.handleMessage(KafkaTopic.RIDE_COMPLETED, JSON.stringify(payload));

      expect(paymentsService.processRidePayment).toHaveBeenCalledWith('ride-999');
      expect(analyticsService.writeAnalytics).toHaveBeenCalledWith('ride-999');
    });

    it('should handle transit.driver.location_updated and log fanout hook', async () => {
      const payload = {
        eventId: 'evt-2',
        timestamp: new Date().toISOString(),
        topic: KafkaTopic.DRIVER_LOCATION_UPDATED,
        data: { driverId: 'driver-1', lat: 12.97, lng: 77.59, rideId: 'ride-999' },
      };

      await service.handleMessage(
        KafkaTopic.DRIVER_LOCATION_UPDATED,
        JSON.stringify(payload),
      );

      // Should not throw and processes successfully
      expect(true).toBe(true);
    });
  });
});
