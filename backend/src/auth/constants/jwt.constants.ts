export const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
export const JWT_EXPIRATION = '15m';
export const REFRESH_TOKEN_EXPIRATION = '7d';
export const OTP_EXPIRATION = 300; // 5 minutes
export const MAX_OTP_ATTEMPTS = 5;
export const OTP_LOCKOUT_TIME = 600; // 10 minutes
export const OTP_LENGTH = 6;
