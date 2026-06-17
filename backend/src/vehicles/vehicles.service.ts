import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Driver } from 'src/drivers/entities/driver.entity';
import { FuelType, Vehicle } from 'src/drivers/entities/vehicle.entity';
import { VehicleInfoDto } from 'src/vehicles/dto/vehicleInfo.dto';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class VehiclesService {
    constructor(
        @InjectRepository(User) private userRepository:Repository<User>,
        @InjectRepository(Driver) private readonly driversRepository: Repository<Driver>,
        @InjectRepository(Vehicle) private  vehicleRepository: Repository<Vehicle>,
    ){}

    async addVehicle(userId:string,vehicleDto:VehicleInfoDto){
       const driver = await this.driversRepository.findOne({where:{userId}})
       if(!driver){
            throw new NotFoundException("Driver Not Found")
       }
       const driverId = driver.id
       const existingVehicle = await this.vehicleRepository.findOne({where:{driver:{id:driver.id },}})
       if(existingVehicle){
        throw new Error("A Vehicle is Already Registered with this Driver")
       }
       const vehicle = this.vehicleRepository.create({
        driver_id:driverId,
        driver:{id:driverId} as Driver,
        licensePlate:vehicleDto.licensePlate,
        make:vehicleDto.make,
        model:vehicleDto.model,
        fuelType:FuelType.PETROL,

       })
       const savedVehicle = this.vehicleRepository.save(vehicle)
       return savedVehicle


    }

    async displayVehicle(userId:string){
        const driver = await this.driversRepository.findOne({where:{userId}})

        if(!driver){
            throw new NotFoundException("Driver not found")
        }

        const vehicle = await this.vehicleRepository.findOne({where:{driver_id:driver.id}})
        if(!vehicle){
            throw new NotFoundException("No vehicle found")
        }
        return vehicle
    }

    async updateVehicleInfo(userId:string,driverInfo:VehicleInfoDto){
        const driver = await this.driversRepository.findOne({where:{userId}})

        if(!driver){
            throw new NotFoundException("Driver not found")
        }

        const vehicle = await this.vehicleRepository.findOne({where:{driver_id:driver.id}})
        if(!vehicle){
            throw new NotFoundException("No vehicle found")
        }
        Object.assign(vehicle,driverInfo)
        return this.vehicleRepository.save(vehicle)

    }
}
