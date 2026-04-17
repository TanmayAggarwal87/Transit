import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { DriverPersonalInfo } from 'src/dto/driverPersonalDetails.dto';
import { DriversService } from './drivers.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/role.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { User } from 'src/users/entities/user.entity';
import { CurrentUser } from 'src/auth/decorators/current-users.decorator';

@Controller('drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DriversController {
  constructor(private driverService: DriversService) {}

  @Post('register')
  register(
    @CurrentUser() user: any, // ← extract user from JWT
    @Body() dto: DriverPersonalInfo,
    ) {
        return this.driverService.register(user.userId, dto);
    }

    // Only approved drivers can access this
    @Get('me')
    @Roles('driver')
    getProfile(@CurrentUser() user: User) {
        return this.driverService.findById(user.id);
    }

    
}
