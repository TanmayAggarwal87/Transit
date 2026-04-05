import { Injectable, BadRequestException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { MAX_OTP_ATTEMPTS, OTP_LOCKOUT_TIME } from '../constants/jwt.constants';

@Injectable()
export class RateLimitService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager) {}

  async checkAttempts(phone: string): Promise<void> {
    const lockoutKey = `otp_lockout:${phone}`;
    const attemptsKey = `otp_attempts:${phone}`;

    const isLocked = await this.cacheManager.get(lockoutKey);
    if (isLocked) {
      throw new BadRequestException('Too many attempts. Try again later.');
    }

    const attempts = (await this.cacheManager.get(attemptsKey)) || 0;
    if (attempts >= MAX_OTP_ATTEMPTS) {
      await this.cacheManager.set(lockoutKey, true, OTP_LOCKOUT_TIME * 1000);
      throw new BadRequestException('Account locked due to too many failed attempts.');
    }
  }

  async incrementAttempts(phone: string): Promise<void> {
    const attemptsKey = `otp_attempts:${phone}`;
    const attempts = (await this.cacheManager.get(attemptsKey)) || 0;
    await this.cacheManager.set(attemptsKey, attempts + 1, 600000); // 10 min window
  }

  async resetAttempts(phone: string): Promise<void> {
    await this.cacheManager.del(`otp_attempts:${phone}`);
    await this.cacheManager.del(`otp_lockout:${phone}`);
  }
}
