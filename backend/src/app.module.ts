import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import {CacheModule} from "@nestjs/cache-manager"
import {ConfigModule} from "@nestjs/config"

@Module({
  imports: [
    //-- for globalizing package and .env--
    ConfigModule.forRoot({
    isGlobal: true,
  }),

    AuthModule,
  //--- ORM with postgres setup--

    // for caching module 
    CacheModule.register()
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
