import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageModule } from './storage/storage.module';
import { User } from './users/entities/user.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { UsersModule } from './users/users.module';
import { DriversModule } from './drivers/drivers.module';
import { Driver } from './drivers/entities/driver.entity';
import { Vehicle } from './drivers/entities/vehicle.entity';
import { DriverDocument } from './drivers/entities/driver-document.entity';
import { VehicleDocument } from './drivers/entities/vehicle-document.entity';
import { BankAccount } from './drivers/entities/bank-account.entity';
import { DriverLocationHistory } from './drivers/entities/driver-location-history.entity';
import { VehiclesModule } from './vehicles/vehicles.module';
import { AdminModule } from './admin/admin.module';
import { SavedPlaceModule } from './saved-place/saved-place.module';
import { SavedPlace } from './saved-place/entity/saved-place.entity';
import { PaymentMethod } from './payment-methods/entity/payment-method.entity';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { RidesModule } from './rides/rides.module';
import { Ride } from './rides/entities/ride.entity';
import { Fare } from './rides/entities/fare.entity';
import { RideStatusHistory } from './rides/entities/ride-status-history.entity';

import { RedisModule } from './redis/redis.module';
import { KafkaModule } from './kafka/kafka.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ScheduleModule } from '@nestjs/schedule';
import { Payment } from './payments/entities/payment.entity';
import { DriverEarning } from './payments/entities/driver-earning.entity';
import { DriverPayout } from './payments/entities/driver-payout.entity';
import { Rating } from './ratings/entities/rating.entity';
import { RatingsModule } from './ratings/ratings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { InAppNotification } from './notifications/entities/in-app-notification.entity';
import { DeviceToken } from './notifications/entities/device-token.entity';
import { SafetyModule } from './safety/safety.module';
import { SosAlert } from './safety/entities/sos-alert.entity';
import { HistoryModule } from './history/history.module';
import { RideAnalytics } from './history/entities/ride-analytics.entity';
import { SupportModule } from './support/support.module';
import { SupportTicket } from './support/entities/support-ticket.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisModule,
    KafkaModule,
    ScheduleModule.forRoot(),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl =
          configService.get<string>('REDIS_URL') ||
          `redis://${configService.get<string>('REDIS_HOST', 'localhost')}:${configService.get<number>('REDIS_PORT', 6379)}`;
        return {
          stores: [
            new Keyv({
              store: new KeyvRedis(redisUrl),
              ttl: 5 * 60 * 1000,
            }),
          ],
        };
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DB_URL'),
        entities: [
          User,
          RefreshToken,
          Driver,
          Vehicle,
          DriverDocument,
          VehicleDocument,
          BankAccount,
          SavedPlace,
          PaymentMethod,
          Ride,
          Fare,
          RideStatusHistory,
          DriverLocationHistory,
          Payment,
          DriverEarning,
          DriverPayout,
          Rating,
          InAppNotification,
          DeviceToken,
          SosAlert,
          RideAnalytics,
          SupportTicket,
        ],
        // Apply schema changes through the migration CLI, never on app startup.
        synchronize: false,
        ssl: true,
        extra: {
          ssl: {
            rejectUnauthorized: false,
          },
        },
      }),
    }),
    StorageModule,
    AuthModule,
    SavedPlaceModule,
    PaymentMethodsModule,
    UsersModule,
    DriversModule,
    VehiclesModule,
    AdminModule,
    RidesModule,
    RealtimeModule,
    RatingsModule,
    NotificationsModule,
    SafetyModule,
    HistoryModule,
    SupportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [],
})
export class AppModule {}
