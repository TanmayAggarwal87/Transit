import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DriverPersonalInfo } from 'src/drivers/dto/driverPersonalDetails.dto';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { Driver, DriverOnboardingStatus, DriverStatus } from './entities/driver.entity';
import { UpdateDriverProfileDto } from 'src/drivers/dto/update-driver.dto';
import { AddBankAccountDto, UpdateBankAccountDto } from 'src/drivers/dto/bank-account.dto';
import { BankAccount } from './entities/bank-account.entity';
import { DriverLocationHistory } from './entities/driver-location-history.entity';
import { UpdateDriverLocationDto } from './dto/update-location.dto';
import { DriverDocumentsService } from './driver-documents.service';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Driver)
    private readonly driversRepository: Repository<Driver>,
    @InjectRepository(BankAccount) private driverBankAccount :Repository<BankAccount>,
    @InjectRepository(DriverLocationHistory)
    private readonly driverLocationHistoryRepo: Repository<DriverLocationHistory>,
    private driverDocumentsService : DriverDocumentsService,
    private redisService: RedisService,
  ) {}

  async register(userId: string, driverInfo: DriverPersonalInfo) {
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


  async findById(userId: string): Promise<Driver> {
    const driver = await this.driversRepository.findOne({
      where: { userId },
      relations: ['vehicles', 'documents', 'user'],
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }

  /**
   * Find driver by User ID
   * @param userId - User ID from JWT
   * @returns Driver object with relations
   */
  async findByUserId(userId: string): Promise<Driver | null> {
    return this.driversRepository.findOne({
      where: { userId },
      relations: ['user'],
    });
  }
  async updateProfile(userId:string, driverInfo:UpdateDriverProfileDto){
   
      const driver = await this.driversRepository.findOne({where:{userId}})
      if(!driver){
        throw new NotFoundException("Driver not found")
      }
      Object.assign(driver,driverInfo)
      return this.driversRepository.save(driver)
    
  }

  async addBankDetails(userId:string,userName:string, driverBankDetails:AddBankAccountDto){
    console.log("add bank")
    const driver = await this.driversRepository.findOne({where:{userId}})
    console.log("add bank")
    console.log(userName)
    if(!driver){
      throw new NotFoundException("Driver not found");
    }
    const driverAccountPayload = this.driverBankAccount.create({
      driverId:driver.id,
      accountHolderName:userName,
      accountNumber:driverBankDetails.accountNumber,
      ifscCode:driverBankDetails.ifscCode,
      bankName:driverBankDetails.bankName
    })
      


    const savedBankAccount = await this.driverBankAccount.save(driverAccountPayload);

    return savedBankAccount;

  }

  async updateBankDetails(userId:string,name:string,updatedBankDetails:UpdateBankAccountDto){
    const driver = await this.driversRepository.findOne({where:{userId}})
    if(!driver){
      throw new NotFoundException("Driver Not found")
    }
    Object.assign(driver,updatedBankDetails)
      return this.driversRepository.save(driver)

  }

  async toggleStatus(userId: string, driverDto: DriverPersonalInfo) {
    const driver = await this.driversRepository.findOne({ where: { userId } });
    if (!driver) {
      throw new NotFoundException('driver not found');
    }

    if (driver.status === DriverStatus.OFFLINE) {
      driver.status = DriverStatus.ONLINE;
      await this.redisService.setDriverStatus(driver.id, 'available');
      if (driver.currentLat != null && driver.currentLng != null) {
        await this.redisService.setDriverLocation(
          driver.id,
          driver.currentLat,
          driver.currentLng,
          driver.heading || 0,
        );
      }
    } else if (driver.status === DriverStatus.ONLINE) {
      driver.status = DriverStatus.OFFLINE;
      await this.redisService.setDriverStatus(driver.id, 'offline');
      await this.redisService.removeDriverGeoLocation(driver.id);
    }

    return this.driversRepository.save(driver);
  }

  async setBreak(userId: string) {
    const driver = await this.driversRepository.findOne({ where: { userId } });
    if (!driver) {
      throw new NotFoundException('driver not found');
    }

    driver.status = DriverStatus.BREAK;
    await this.redisService.setDriverStatus(driver.id, 'offline');
    await this.redisService.removeDriverGeoLocation(driver.id);
    return this.driversRepository.save(driver);
  }

  async resume(userId: string) {
    const driver = await this.driversRepository.findOne({ where: { userId } });
    if (!driver) {
      throw new NotFoundException('driver not found');
    }

    driver.status = DriverStatus.ONLINE;
    await this.redisService.setDriverStatus(driver.id, 'available');
    return this.driversRepository.save(driver);
  }

   async getDriverByUserId(userId: string): Promise<Driver> {
    const driver = await this.driversRepository.findOne({
      where: { userId },
    });
    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }
    return driver;
  }

  async uploadDriverDocument(
    userId: string,
    file: Express.Multer.File,
    dto: any,
  ) {
    const driver = await this.getDriverByUserId(userId);
    return this.driverDocumentsService.uploadDocument(driver.id, file, dto);
  }

  async getDriverDocuments(userId: string) {
    const driver = await this.getDriverByUserId(userId);
    return this.driverDocumentsService.findByDriverId(driver.id);
  }

  async viewDriverDocument(documentId: string, userId: string) {
    return this.driverDocumentsService.getSignedViewUrl(documentId, userId);
  }

  /**
   * Update driver location from GPS ping.
   * Updates drivers table, Redis Hash, Redis GEO index.
   * If driver has active ride: inserts DriverLocationHistory row and triggers WS hook.
   */
  async updateDriverLocation(
    userId: string,
    dto: UpdateDriverLocationDto,
  ): Promise<{ success: boolean; driverId: string; lat: number; lng: number }> {
    const driver = await this.driversRepository.findOne({ where: { userId } });
    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    driver.currentLat = dto.lat;
    driver.currentLng = dto.lng;
    if (dto.heading !== undefined && dto.heading !== null) {
      driver.heading = dto.heading;
    }
    driver.lastLocationUpdate = new Date();
    await this.driversRepository.save(driver);

    // Update Redis GEO index and Hash
    await this.redisService.setDriverLocation(
      driver.id,
      dto.lat,
      dto.lng,
      dto.heading ?? 0,
    );

    // If driver has active ride: insert DriverLocationHistory and trigger Phase 6 WS hook
    if (dto.ride_id) {
      const history = this.driverLocationHistoryRepo.create({
        driverId: driver.id,
        rideId: dto.ride_id,
        lat: dto.lat,
        lng: dto.lng,
        heading: dto.heading ?? null,
        speedKmh: dto.speed_kmh ?? null,
      });
      await this.driverLocationHistoryRepo.save(history);

      // WebSocket push hook for Phase 6
      this.logger.log(
        `[WebSocket: ride:${dto.ride_id}:location] Driver ${driver.id} location: ${dto.lat}, ${dto.lng}, heading: ${dto.heading ?? 0}`,
      );
    }

    return {
      success: true,
      driverId: driver.id,
      lat: dto.lat,
      lng: dto.lng,
    };
  }
}
