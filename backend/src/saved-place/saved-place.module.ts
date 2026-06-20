import { Module } from '@nestjs/common';
import { SavedPlaceService } from './saved-place.service';
import { SavedPlaceController } from './saved-place.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { User } from 'src/users/entities/user.entity';
import { SavedPlace } from './entity/saved-place.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, SavedPlace]), AuthModule],
  providers: [SavedPlaceService],
  controllers: [SavedPlaceController],
})
export class SavedPlaceModule {}
