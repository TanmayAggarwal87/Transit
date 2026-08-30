import { Module } from '@nestjs/common';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { DriverDocumentsService } from './driver-documents.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver } from './entities/driver.entity';
import { DriverDocument } from './entities/driver-document.entity';
import { User } from 'src/users/entities/user.entity';
import { BankAccount } from './entities/bank-account.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Driver,
      DriverDocument,
      User,
      BankAccount,
    ]),
    AuthModule,
  ],
  controllers: [DriversController],
  providers: [DriversService, DriverDocumentsService],
  exports: [DriversService],
})
export class DriversModule {}
