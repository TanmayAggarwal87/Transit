import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver, DriverOnboardingStatus } from '../../drivers/entities/driver.entity';

@Injectable()
export class VerifiedDriverGuard implements CanActivate {
  constructor(
    @InjectRepository(Driver) private driverRepository: Repository<Driver>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new ForbiddenException('User not authenticated');
    }

    // Find driver by userId
    const driver = await this.driverRepository.findOne({
      where: { userId: user.userId },
    });

    if (!driver) {
      throw new ForbiddenException('Driver profile not found');
    }

    // Check if driver is verified
    if (driver.onboardingStatus !== DriverOnboardingStatus.VERIFIED) {
      throw new ForbiddenException(
        `Driver account not verified. Current status: ${driver.onboardingStatus}`,
      );
    }

    return true;
  }
}
