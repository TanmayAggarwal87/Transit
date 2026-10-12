import axios, { isAxiosError } from 'axios';
import { getApiBaseUrl } from './auth';

const request = async <T>(token: string, method: 'get' | 'post' | 'patch' | 'delete', path: string, data?: unknown) => {
  const response = await axios.request<T>({
    method,
    url: `${getApiBaseUrl()}${path}`,
    data,
    headers: { Authorization: `Bearer ${token}`, ...(data ? { 'Content-Type': 'application/json' } : {}) },
    timeout: 15000,
  });
  return response.data;
};

export type PaymentMethod = {
  id: string; type: 'card' | 'upi' | 'wallet' | 'netbanking'; brand?: string;
  last4?: string; isDefault: boolean;
};
export type PaymentHistoryItem = {
  id: string; rideId: string; amountPaise: string | number; currency: string;
  status: string; createdAt: string;
};
export type SavedPlace = {
  id: string; name: string; address: string; latitude: number; longitude: number; landmark?: string;
};
export type Page<T> = { items: T[]; page: number; limit: number; total: number; totalPages: number };

export const getPaymentMethods = (token: string) => request<PaymentMethod[]>(token, 'get', '/users/me/payment-methods');
export const setDefaultPaymentMethod = (token: string, id: string) => request<PaymentMethod>(token, 'patch', `/users/me/payment-methods/${id}/default`);
export const deletePaymentMethod = (token: string, id: string) => request<{ success: boolean }>(token, 'delete', `/users/me/payment-methods/${id}`);
export const getPaymentHistory = (token: string) => request<Page<PaymentHistoryItem>>(token, 'get', '/users/me/payment-history?page=1&limit=50');
export const getSavedPlaces = async (token: string) => {
  const result = await request<SavedPlace[] | { message: string }>(token, 'get', '/users/saved-place');
  return Array.isArray(result) ? result : [];
};
export const deleteSavedPlace = (token: string, id: string) => request<{ success: boolean }>(token, 'delete', `/users/saved-place/${id}`);

export const getApiMessage = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join('\n');
    if (typeof message === 'string') return message;
  }
  return error instanceof Error ? error.message : fallback;
};
