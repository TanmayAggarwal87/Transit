import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/redis/redis.service';
import axios from 'axios';

export interface FareCategoryEstimate {
  category: string;
  displayName: string;
  baseFare: number;
  distanceFare: number;
  durationFare: number;
  surgeMultiplier: number;
  totalFare: number;
  etaMin: number;
}

export interface FareEstimateResult {
  distanceKm: number;
  durationMin: number;
  estimates: FareCategoryEstimate[];
}

interface CategoryPricingConfig {
  displayName: string;
  baseFare: number;
  perKmRate: number;
  perMinRate: number;
  defaultEtaMin: number;
}

const CATEGORY_PRICING: Record<string, CategoryPricingConfig> = {
  hatchback: {
    displayName: 'Transit Go (Hatchback)',
    baseFare: 40,
    perKmRate: 10,
    perMinRate: 2,
    defaultEtaMin: 4,
  },
  sedan: {
    displayName: 'Transit Premium (Sedan)',
    baseFare: 60,
    perKmRate: 12,
    perMinRate: 3,
    defaultEtaMin: 6,
  },
  suv: {
    displayName: 'Transit XL (SUV)',
    baseFare: 100,
    perKmRate: 15,
    perMinRate: 4,
    defaultEtaMin: 8,
  },
  ev: {
    displayName: 'Transit Green (EV)',
    baseFare: 45,
    perKmRate: 9,
    perMinRate: 2,
    defaultEtaMin: 5,
  },
};

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Estimate fares for all vehicle categories between pickup and destination.
   */
  async estimateFare(
    pickupLat: number,
    pickupLng: number,
    destLat: number,
    destLng: number,
  ): Promise<FareEstimateResult> {
    const route = await this.calculateDistanceAndDuration(
      pickupLat,
      pickupLng,
      destLat,
      destLng,
    );

    const categories = Object.keys(CATEGORY_PRICING);
    const estimates: FareCategoryEstimate[] = [];

    for (const category of categories) {
      const estimate = await this.estimateCategoryFare(
        category,
        route.distanceKm,
        route.durationMin,
      );
      estimates.push(estimate);
    }

    return {
      distanceKm: Math.round(route.distanceKm * 10) / 10,
      durationMin: Math.round(route.durationMin),
      estimates,
    };
  }

  /**
   * Estimate fare for a single vehicle category
   */
  async estimateCategoryFare(
    category: string,
    distanceKm: number,
    durationMin: number,
  ): Promise<FareCategoryEstimate> {
    const config = CATEGORY_PRICING[category] || CATEGORY_PRICING.hatchback;

    // Fetch surge multiplier from Redis (defaults to 1.0)
    const surgeKey = `pricing:surge:${category}`;
    const cachedSurge = await this.redisService.getRideCache<number>(surgeKey);
    const surgeMultiplier = cachedSurge && cachedSurge > 0 ? cachedSurge : 1.0;

    const baseFare = config.baseFare;
    const distanceFare = Math.round(distanceKm * config.perKmRate * 10) / 10;
    const durationFare = Math.round(durationMin * config.perMinRate * 10) / 10;

    const rawTotal = (baseFare + distanceFare + durationFare) * surgeMultiplier;
    const totalFare = Math.round(rawTotal);

    return {
      category,
      displayName: config.displayName,
      baseFare,
      distanceFare,
      durationFare,
      surgeMultiplier,
      totalFare,
      etaMin: config.defaultEtaMin,
    };
  }

  /**
   * Calculate distance (in km) and duration (in min) between coordinates.
   * Tries Google Maps Distance Matrix API / OSRM if configured, otherwise uses Haversine algorithm.
   */
  private async calculateDistanceAndDuration(
    pickupLat: number,
    pickupLng: number,
    destLat: number,
    destLng: number,
  ): Promise<{ distanceKm: number; durationMin: number }> {
    const googleApiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');

    if (googleApiKey) {
      try {
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${pickupLat},${pickupLng}&destinations=${destLat},${destLng}&key=${googleApiKey}`,
        );

        const element = response.data?.rows?.[0]?.elements?.[0];
        if (element && element.status === 'OK') {
          const distanceKm = element.distance.value / 1000;
          const durationMin = element.duration.value / 60;
          return { distanceKm, durationMin };
        }
      } catch (err) {
        this.logger.warn('Google Maps Distance Matrix API request failed, falling back to Haversine formula', err);
      }
    }

    // Fallback: Haversine distance with road detour multiplier
    return this.calculateHaversineRoute(pickupLat, pickupLng, destLat, destLng);
  }

  /**
   * Haversine formula calculation for road distance and duration fallback.
   */
  private calculateHaversineRoute(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): { distanceKm: number; durationMin: number } {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightDistance = R * c;

    // Road detour factor (~1.3x straight-line distance in urban settings)
    const distanceKm = straightDistance * 1.3;

    // Estimated speed in city traffic (~25 km/h)
    const durationMin = (distanceKm / 25) * 60;

    return { distanceKm, durationMin };
  }
}
