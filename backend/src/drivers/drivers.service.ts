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
import { UpdateDriverProfileDto } from 'src/dto/update-driver.dto';
import { AddBankAccountDto, UpdateBankAccountDto } from 'src/dto/bank-account.dto';
import { BankAccount } from './entities/bank-account.entity';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Driver)
    private readonly driversRepository: Repository<Driver>,
    @InjectRepository(BankAccount) private driverBankAccount :Repository<BankAccount>
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
}
