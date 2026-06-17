import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleDocument } from 'src/drivers/entities/vehicle-document.entity';
import { DriverDocument } from 'src/drivers/entities/driver-document.entity';
import { User } from 'src/users/entities/user.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports:[
    TypeOrmModule.forFeature([
          DriverDocument,
          User,
          VehicleDocument
        ]),
        AuthModule,
  ],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
