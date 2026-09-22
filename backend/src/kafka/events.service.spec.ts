import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventsService } from './events.service';
import { KafkaTopic } from './kafka.constants';

describe('EventsService', () => {
  let service: EventsService;
  let mockProducer: any;

  beforeEach(async () => {
    mockProducer = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue([{ topicName: 'test', partition: 0 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: any) => {
              if (key === 'KAFKA_BROKERS') return 'localhost:9092';
              if (key === 'KAFKA_CLIENT_ID') return 'transit-test';
              return defaultVal;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    // Inject mock producer into private producer
    (service as any).producer = mockProducer;
    (service as any).isConnected = true;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('emit', () => {
    it('should emit an event with structured envelope containing eventId, timestamp, and data', async () => {
      const payload = { rideId: 'ride-101', status: 'requested' };

      const envelope = await service.emit(KafkaTopic.RIDE_REQUESTED, payload);

      expect(envelope).toBeDefined();
      expect(envelope.topic).toBe(KafkaTopic.RIDE_REQUESTED);
      expect(envelope.eventId).toBeDefined();
      expect(typeof envelope.eventId).toBe('string');
      expect(envelope.timestamp).toBeDefined();
      expect(envelope.data).toEqual(payload);

      expect(mockProducer.send).toHaveBeenCalledTimes(1);
      const sendArgs = mockProducer.send.mock.calls[0][0];
      expect(sendArgs.topic).toBe(KafkaTopic.RIDE_REQUESTED);
      expect(sendArgs.messages).toHaveLength(1);
      expect(JSON.parse(sendArgs.messages[0].value)).toEqual(envelope);
    });

    it('should catch producer errors and return envelope gracefully without throwing', async () => {
      mockProducer.send.mockRejectedValueOnce(new Error('Broker unreachable'));

      const payload = { rideId: 'ride-102' };
      const envelope = await service.emit(KafkaTopic.RIDE_CANCELLED, payload);

      expect(envelope).toBeDefined();
      expect(envelope.topic).toBe(KafkaTopic.RIDE_CANCELLED);
      expect(envelope.data).toEqual(payload);
    });
  });
});
