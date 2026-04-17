import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Inject } from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RateLimitService } from './services/rate-limit.service';
import { SmsService } from './services/sms.service';
import { CompleteProfileDto } from 'src/dto/complete-profile.dto';
import { OTP_EXPIRATION, REFRESH_TOKEN_EXPIRATION, OTP_LENGTH } from './constants/jwt.constants';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(RefreshToken) private refreshTokenRepository: Repository<RefreshToken>,
    @Inject(CACHE_MANAGER) private cacheManager,
    private jwtService: JwtService,
    private rateLimitService: RateLimitService,
    private smsService: SmsService,
  ) {}

  async sendOtp(phone: string) {
    const otp = Math.floor(Math.random() * Math.pow(10, OTP_LENGTH))
      .toString()
      .padStart(OTP_LENGTH, '0');

    const otpKey = `otp:${phone}`;
    const sendCountKey = `otp_send:${phone}`;

    const sendCount = (await this.cacheManager.get(sendCountKey)) || 0;
    if (sendCount >= 5) {
      throw new BadRequestException('Too many OTP requests. Try again later.');
    }

    await this.cacheManager.set(otpKey, otp, OTP_EXPIRATION * 1000);
    await this.cacheManager.set(sendCountKey, sendCount + 1, 3600000); // 1 hour window

    await this.smsService.sendOtp(phone, otp);

    return { message: 'OTP sent successfully', expiresIn: OTP_EXPIRATION };
  }

  async verifyOtp(phone: string, otp: string) {
    await this.rateLimitService.checkAttempts(phone);

    const otpKey = `otp:${phone}`;
    const storedOtp = await this.cacheManager.get(otpKey);

    if (!storedOtp || storedOtp !== otp) {
      await this.rateLimitService.incrementAttempts(phone);
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.cacheManager.del(otpKey);
    await this.rateLimitService.resetAttempts(phone);

    const user = await this.userRepository.findOne({ where: { phone } });

    if (user) {
      const { accessToken, refreshToken } = await this.generateTokens(user);
      return {
        isNewUser: false,
        accessToken,
        refreshToken,
        user: { id: user.id, phone: user.phone, name: user.name, email: user.email, avatar: user.avatar },
      };
    }

    // For new user, return a short-lived onboarding token
    const onboardingToken = this.jwtService.sign(
      { phone, type: 'onboarding' },
      { expiresIn: '10m', subject: 'onboarding' },
    );

    return {
      isNewUser: true,
      onboardingToken,
    };
  }

  async completeProfile(phone: string, profileDto: CompleteProfileDto) {
    const existingUserByPhone = await this.userRepository.findOne({ where: { phone } });
    const existingUserByEmail = await this.userRepository.findOne({ where: { email: profileDto.email } });

    if (existingUserByPhone || existingUserByEmail) {
      throw new ConflictException('Phone or email already exists');
    }

    const userPayload: any = {
      phone,
      name: profileDto.name,
      email: profileDto.email,
    };
    if (profileDto.avatar) {
      userPayload.avatar = profileDto.avatar;
    }
    
    const newUser = new User();
    newUser.phone = phone;
    newUser.name = profileDto.name;
    newUser.email = profileDto.email;
    if (profileDto.avatar) {
      newUser.avatar = profileDto.avatar;
    }

    const savedUser = await this.userRepository.save(newUser);

    const { accessToken, refreshToken } = await this.generateTokens(savedUser);

    return {
      accessToken,
      refreshToken,
      user: { id: savedUser.id, phone: savedUser.phone, name: savedUser.name, email: savedUser.email, avatar: savedUser.avatar,roles:savedUser.roles },
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
      relations: ['user'],
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired refresh token');
    }

    const { accessToken } = await this.generateTokens(tokenRecord.user);
    return { accessToken };
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, phone: user.phone ,roles:user.roles};

    const accessToken = this.jwtService.sign(payload);

    const refreshTokenValue = this.jwtService.sign(payload, {
      expiresIn: REFRESH_TOKEN_EXPIRATION,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const refreshToken = this.refreshTokenRepository.create({
      token: refreshTokenValue,
      user,
      expiresAt,
    });

    await this.refreshTokenRepository.save(refreshToken);

    return {
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }
}

