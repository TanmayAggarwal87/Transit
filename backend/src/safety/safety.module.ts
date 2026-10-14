import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Driver } from '../drivers/entities/driver.entity';
import { User } from '../users/entities/user.entity';
import { Ride } from '../rides/entities/ride.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { RedisModule } from '../redis/redis.module';
import { SafetyController } from './safety.controller';
import { SafetyService } from './safety.service';
import { SosAlert } from './entities/sos-alert.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SosAlert, Ride, User, Driver]),
    AuthModule,
    NotificationsModule,
    RealtimeModule,
    RedisModule,
  ],
  controllers: [SafetyController],
  providers: [SafetyService],
})
export class SafetyModule {}
