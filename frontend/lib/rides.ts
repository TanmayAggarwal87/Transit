import axios from 'axios';
import { getApiBaseUrl } from './auth';

export type RideCategory = 'hatchback' | 'sedan' | 'suv' | 'ev';

export interface FareEstimateParams {
  pickup_lat: number;
  pickup_lng: number;
  dest_lat: number;
  dest_lng: number;
}

export interface FareEstimateItem {
  category: RideCategory;
  displayName: string;
  baseFare: number;
  distanceFare: number;
  durationFare: number;
  surgeMultiplier: number;
  totalFare: number;
  etaMin: number;
}

export interface FareEstimateResponse {
  distanceKm: number;
  durationMin: number;
  estimates: FareEstimateItem[];
}

export interface CreateRidePayload {
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  dest_lat: number;
  dest_lng: number;
  dest_address: string;
  category: RideCategory;
}

export interface CreateRideResponse {
  id: string;
  riderId: string;
  status: string;
  category: RideCategory;
  pickupLat: number;
  pickupLng: number;
  destLat: number;
  destLng: number;
  fare: {
    estimatedTotal: number;
    surgeMultiplier: number;
  };
}

export class RideError extends Error {
  statusCode?: number;
  isConflict?: boolean;

  constructor(message: string, statusCode?: number, isConflict?: boolean) {
    super(message);
    this.name = 'RideError';
    this.statusCode = statusCode;
    this.isConflict = isConflict ?? statusCode === 409;
  }
}

type ApiErrorBody = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

const getErrorMessage = (body: ApiErrorBody | null, defaultMsg: string): string => {
  if (!body?.message) {
    return body?.error || defaultMsg;
  }
  return Array.isArray(body.message) ? body.message.join('\n') : body.message;
};

export const estimateFare = async (params: FareEstimateParams): Promise<FareEstimateResponse> => {
  try {
    const response = await axios.post<FareEstimateResponse>(
      `${getApiBaseUrl()}/rides/estimate`,
      params,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError<ApiErrorBody>(error)) {
      const statusCode = error.response?.status;
      const message = getErrorMessage(error.response?.data ?? null, 'Failed to estimate fare');
      throw new RideError(message, statusCode);
    }
    throw error;
  }
};

export const createRide = async (
  payload: CreateRidePayload,
  token: string | null
): Promise<CreateRideResponse> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.post<CreateRideResponse>(
      `${getApiBaseUrl()}/rides`,
      payload,
      { headers }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError<ApiErrorBody>(error)) {
      const statusCode = error.response?.status;
      const message = getErrorMessage(error.response?.data ?? null, 'Failed to create ride request');
      const isConflict = statusCode === 409 || (typeof message === 'string' && message.toLowerCase().includes('already has an active ride'));
      throw new RideError(message, statusCode, isConflict);
    }
    throw error;
  }
};
