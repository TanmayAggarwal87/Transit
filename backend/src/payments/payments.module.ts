import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsModule } from '../kafka/events.module';
import { PaymentMethodsModule } from '../payment-methods/payment-methods.module';
import { BankAccount } from '../drivers/entities/bank-account.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { User } from '../users/entities/user.entity';
import { Ride } from '../rides/entities/ride.entity';
import { RealtimeModule } from '../realtime/realtime.module';
import { DriverEarning } from './entities/driver-earning.entity';
import { DriverPayout } from './entities/driver-payout.entity';
import { Payment } from './entities/payment.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsScheduler } from './payments.scheduler';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      DriverEarning,
      DriverPayout,
      Ride,
      BankAccount,
      Driver,
      User,
    ]),
    PaymentMethodsModule,
    EventsModule,
    RealtimeModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsScheduler],
  exports: [PaymentsService],
})
export class PaymentsModule {}
