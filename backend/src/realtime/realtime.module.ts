import { Global, Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { DriversModule } from '../drivers/drivers.module';
import { Ride } from '../rides/entities/ride.entity';
import { RidesModule } from '../rides/rides.module';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';

@Global()
@Module({
  imports: [
    AuthModule,
    DriversModule,
    forwardRef(() => RidesModule),
    TypeOrmModule.forFeature([Ride]),
  ],
  providers: [RealtimeGateway, RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
