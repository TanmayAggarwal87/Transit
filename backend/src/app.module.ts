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
import { VehiclesModule } from './vehicles/vehicles.module';
import { AdminModule } from './admin/admin.module';
import { SavedPlaceModule } from './saved-place/saved-place.module';
import { SavedPlace } from './saved-place/entity/saved-place.entity';
import { PaymentMethod } from './payment-methods/entity/payment-method.entity';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { RidesModule } from './rides/rides.module';

import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisModule,
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
        ],
        synchronize: true,
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
