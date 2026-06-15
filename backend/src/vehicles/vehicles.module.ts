import { Module } from '@nestjs/common';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from 'src/drivers/entities/vehicle.entity';
import { VehicleDocument } from 'src/drivers/entities/vehicle-document.entity';
import { User } from 'src/users/entities/user.entity';
import { Driver } from 'src/drivers/entities/driver.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
        TypeOrmModule.forFeature([
            Vehicle,
            VehicleDocument,
            User,
            Driver
        ]),
        AuthModule,
    ],
  controllers: [VehiclesController],
  providers: [VehiclesService]
})

export class VehiclesModule{}
