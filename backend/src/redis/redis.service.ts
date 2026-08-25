import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

export interface DriverLocation {
  lat: number;
  lng: number;
  heading: number;
  updatedAt: number;
}

export interface GeoDriverResult {
  driverId: string;
  distance?: number;
  location?: {
    lat: number;
    lng: number;
  };
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: RedisClientType;

  constructor(private readonly configService: ConfigService) {
    const redisUrl =
      this.configService.get<string>('REDIS_URL') ||
      `redis://${this.configService.get<string>('REDIS_HOST', 'localhost')}:${this.configService.get<number>('REDIS_PORT', 6379)}`;

    this.client = createClient({ url: redisUrl });

    this.client.on('error', (err) => {
      this.logger.error('Redis Client Error', err);
    });
  }

  async onModuleInit(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
      this.logger.log('Redis connected successfully');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.disconnect();
      this.logger.log('Redis disconnected');
    }
  }

  // --- Driver Location ---

  async setDriverLocation(
    driverId: string,
    lat: number,
    lng: number,
    heading: number = 0,
  ): Promise<void> {
    const updatedAt = Date.now();
    await this.client.hSet(`driver:location:${driverId}`, {
      lat: lat.toString(),
      lng: lng.toString(),
      heading: heading.toString(),
      updatedAt: updatedAt.toString(),
    });

    await this.addDriverGeoLocation(driverId, lat, lng);
  }

  async getDriverLocation(driverId: string): Promise<DriverLocation | null> {
    const data = await this.client.hGetAll(`driver:location:${driverId}`);
    if (!data || !data.lat || !data.lng) {
      return null;
    }
    return {
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lng),
      heading: parseFloat(data.heading || '0'),
      updatedAt: parseInt(data.updatedAt || '0', 10),
    };
  }

  // --- Driver Status ---

  async setDriverStatus(driverId: string, status: string): Promise<void> {
    await this.client.set(`driver:status:${driverId}`, status);
  }

  async getDriverStatus(driverId: string): Promise<string | null> {
    return this.client.get(`driver:status:${driverId}`);
  }

  // --- Driver GEO Index ---

  async addDriverGeoLocation(driverId: string, lat: number, lng: number): Promise<void> {
    await this.client.geoAdd('drivers:geo', {
      longitude: lng,
      latitude: lat,
      member: driverId,
    });
  }

  async removeDriverGeoLocation(driverId: string): Promise<void> {
    await this.client.zRem('drivers:geo', driverId);
  }

  async getAvailableDriversInRadius(
    lat: number,
    lng: number,
    radiusKm: number = 5,
    count: number = 20,
  ): Promise<GeoDriverResult[]> {
    const results = await this.client.geoSearchWith(
      'drivers:geo',
      { latitude: lat, longitude: lng },
      { radius: radiusKm, unit: 'km' },
      ['WITHDIST', 'WITHCOORD'],
      { SORT: 'ASC', COUNT: count },
    );

    return results.map((res) => ({
      driverId: res.member,
      distance: typeof res.distance === 'number' ? res.distance : parseFloat(res.distance ?? '0'),
      location: res.coordinates
        ? { lat: res.coordinates.latitude, lng: res.coordinates.longitude }
        : undefined,
    }));
  }

  // --- Ride Cache ---

  async setRideCache(rideId: string, data: unknown, ttlSeconds: number = 3600): Promise<void> {
    await this.client.set(`ride:cache:${rideId}`, JSON.stringify(data), { EX: ttlSeconds });
  }

  async getRideCache<T = unknown>(rideId: string): Promise<T | null> {
    const data = await this.client.get(`ride:cache:${rideId}`);
    return data ? (JSON.parse(data) as T) : null;
  }

  async invalidateRideCache(rideId: string): Promise<void> {
    await this.client.del(`ride:cache:${rideId}`);
  }

  // --- Session Data ---

  async setSessionData(sessionId: string, data: unknown, ttlSeconds: number = 86400): Promise<void> {
    await this.client.set(`session:${sessionId}`, JSON.stringify(data), { EX: ttlSeconds });
  }

  async getSessionData<T = unknown>(sessionId: string): Promise<T | null> {
    const data = await this.client.get(`session:${sessionId}`);
    return data ? (JSON.parse(data) as T) : null;
  }

  async deleteSessionData(sessionId: string): Promise<void> {
    await this.client.del(`session:${sessionId}`);
  }
}
