import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DriverPersonalInfo } from 'src/dto/driverPersonalDetails.dto';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { Driver, DriverOnboardingStatus } from './entities/driver.entity';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Driver)
    private readonly driversRepository: Repository<Driver>,
  ) {}

  async register(userId: string, driverInfo: DriverPersonalInfo) {
    console.log(userId)
    const existingDriver = await this.driversRepository.findOne({
        where: { user: { id: userId } },
        relations: ['user'],
    });
    if (existingDriver) {
      throw new ConflictException('driver profile already exist');
    }
    const driver = this.driversRepository.create({
      userId,
      user: { id: userId } as User,
      licenseNumber: driverInfo.licenseNumber,
      licenseExpiry: new Date(driverInfo.licenseExpiry),
      aadhaarNumber: driverInfo.aadhaarNumber,
      panNumber: driverInfo.panNumber,
      address: driverInfo.address,
      isActive: true,
      onboardingStatus: DriverOnboardingStatus.PENDING,
    });
    const savedDriver = await this.driversRepository.save(driver);

    // === UPDATE USER DB===

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // convert string to array
    let roles: string[] = [];

    try {
      roles = JSON.parse(user.roles ?? '[]');
    } catch {
      roles = [];
    }

    // add role only if missing
    if (!roles.includes('driver')) {
      roles.push('driver');

      // array → string
      user.roles = JSON.stringify(roles);

      await this.userRepository.save(user);
    }

    return savedDriver;
  }

  async findByUserId(userId: string): Promise<Driver> {
    const driver = await this.driversRepository.findOne({
      where: { userId },
      relations: ['vehicles', 'documents'], // load related data
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    return driver;
  }

  async findById(id: string): Promise<Driver> {
    const driver = await this.driversRepository.findOne({
      where: { id },
      relations: ['vehicles', 'documents', 'user'],
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }
}
