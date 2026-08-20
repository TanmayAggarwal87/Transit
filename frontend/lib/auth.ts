import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

type ApiErrorBody = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

export type AuthUser = {
  id: string;
  phone: string;
  name: string;
  email: string;
  avatar?: string;
  roles?: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type VerifyOtpResponse =
  | {
      isNewUser: true;
      onboardingToken: string;
    }
  | ({
      isNewUser: false;
    } & AuthSession);

let cachedApiBaseUrl: string | null = null;

const getApiBaseUrl = () => {
  if (cachedApiBaseUrl) return cachedApiBaseUrl;

  const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
  if (extra?.apiBaseUrl) {
    cachedApiBaseUrl = extra.apiBaseUrl.replace(/\/$/, '');
    return cachedApiBaseUrl;
  }

  const expoConfig = Constants.expoConfig as ({ hostUri?: string } & typeof Constants.expoConfig) | null;
  const hostUri =
    expoConfig?.hostUri ??
    (Constants as any).manifest?.debuggerHost ??
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;
  const host = typeof hostUri === 'string' ? hostUri.split(':')[0] : '';

  if (host) {
    cachedApiBaseUrl = `http://${host}:3000`;
    return cachedApiBaseUrl;
  }

  cachedApiBaseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
  return cachedApiBaseUrl;
};

const getErrorMessage = (body: ApiErrorBody | null) => {
  if (!body?.message) {
    return body?.error || 'Something went wrong';
  }

  return Array.isArray(body.message) ? body.message.join('\n') : body.message;
};

const authRequest = async <T>(path: string, body: Record<string, unknown>): Promise<T> => {
  try {
    const response = await axios.post<T>(`${getApiBaseUrl()}${path}`, body, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError<ApiErrorBody>(error)) {
      throw new Error(getErrorMessage(error.response?.data ?? null));
    }

    throw error;
  }
};

export const sendOtp = (phone: string) =>
  authRequest<{ message: string; expiresIn: number }>('/auth/sendOtp', { phone });

export const verifyOtp = (phone: string, otp: string) =>
  authRequest<VerifyOtpResponse>('/auth/verifyOtp', { phone, otp });

export const completeProfile = (profile: {
  phone: string;
  name: string;
  email: string;
  avatar?: string;
  onboardingToken?: string;
}) => authRequest<AuthSession>('/auth/completeProfile', profile);

export const logout = (refreshToken: string) =>
  authRequest<{ message: string }>('/auth/logout', { refreshToken });
