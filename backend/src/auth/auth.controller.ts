import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { phone } from 'src/auth/dto/phone.dto';
import { VerifyOtpDto } from 'src/auth/dto/verify-otp.dto';
import { CompleteProfileDto } from 'src/users/dto/complete-profile.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('sendOtp')
  async sendOtp(@Body(new ValidationPipe()) { phone }: phone) {
    return this.authService.sendOtp(phone);
  }

  @Post('verifyOtp')
  async verifyOtp(@Body(new ValidationPipe()) { phone, otp }: VerifyOtpDto) {
    return this.authService.verifyOtp(phone, otp);
  }

  @Post('completeProfile')
  async completeProfile(
    @Body(new ValidationPipe()) body: CompleteProfileDto & { phone: string },
  ) {
    return this.authService.completeProfile(body.phone, {
      name: body.name,
      email: body.email,
      avatar: body.avatar,
    });
  }

  @Post('refresh')
  async refreshToken(@Body(new ValidationPipe()) { refreshToken }: { refreshToken: string }) {
    return this.authService.refreshAccessToken(refreshToken);
  }

  @Post('logout')
  async logout(@Body(new ValidationPipe()) { refreshToken }: { refreshToken: string }) {
    return this.authService.logout(refreshToken);
  }
}

