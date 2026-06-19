import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NotFoundError } from 'rxjs';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { VerifyDriverDocuments } from './dto/verify-driver-document.dto';
import { DriverDocument,DocumentStatus } from 'src/drivers/entities/driver-document.entity';
import { Driver,DriverOnboardingStatus } from 'src/drivers/entities/driver.entity';
import { VehicleDocument } from 'src/drivers/entities/vehicle-document.entity';
import { Vehicle } from 'src/drivers/entities/vehicle.entity';


@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(User) private userRepository: Repository<User>,
        @InjectRepository(Driver) private driverRepository: Repository<Driver>,
        @InjectRepository(DriverDocument) private driverDocumentRepository: Repository<DriverDocument>,
        @InjectRepository(VehicleDocument) private vehicleDocumentRepository: Repository<VehicleDocument>,
        @InjectRepository(Vehicle) private vehicleRepository:Repository<Vehicle>
    ) {
    }

    async addAdmin(userId: string) {
        const isAdmin = await this.userRepository.findOne({ where: { id: userId } })

        if (!isAdmin) {
            throw new ConflictException('Admin profile already exist');
        }

        // CHECK FOR USER 
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
            roles.push('admin');

            // array → string
            user.roles = JSON.stringify(roles);

            await this.userRepository.save(user);

        }

        return user
    }

    async verifyDriver(driverId: string, userId: string, dto: VerifyDriverDocuments) {
        const driver = await this.driverRepository.findOne({ where: { id: driverId } });
        if (!driver) {
            throw new NotFoundException('Driver not found');
        }
        const documents = await this.driverDocumentRepository.find({
            where: { driver_id: driverId },
        });

        if (!documents.length) {
            throw new NotFoundException('Driver documents not found');
        }

        const status = dto.status as DocumentStatus;

        for (const document of documents) {
            document.status = status;
            document.verifiedBy = userId;
            document.verifiedAt = new Date();
        }

        await this.driverDocumentRepository.save(documents);

        if (status === DocumentStatus.APPROVED) {
            driver.onboardingStatus = DriverOnboardingStatus.VERIFIED;
        }

        if (status === DocumentStatus.REJECTED) {
            driver.onboardingStatus = DriverOnboardingStatus.REJECTED;
        }

        await this.driverRepository.save(driver);

        return {
            message: 'Driver verification updated',
            driver,
            documents,

        }
    }


    async verifyVehicle(driverId: string, userId: string, status: DocumentStatus) {
        if (!status) {
            throw new BadRequestException('status is required');
        }

        const driver = await this.driverRepository.findOne({ where: { id: driverId } });
        if (!driver) {
            throw new NotFoundException('Driver not found');
        }
        const vehicle = await this.vehicleRepository.findOne({
            where: { driver_id: driverId },
        });

        if(!vehicle){
            throw new NotFoundException("No vehicle registered with this driver")
        }

        const documents = await this.vehicleDocumentRepository.find({where:{vehicle_id:vehicle!.id}})

        if (!documents.length) {
            throw new NotFoundException('vehicle documents not found');
        }

        for (const document of documents) {
            document.status = status;
            document.verifiedBy = userId;
            document.verifiedAt = new Date();
        }

        await this.vehicleDocumentRepository.save(documents);

        return {
            message: 'vehicle verification updated',
            driver,
            documents,

        }
    }
}
