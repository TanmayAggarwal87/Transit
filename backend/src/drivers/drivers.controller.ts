import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { DriverPersonalInfo } from 'src/dto/driverPersonalDetails.dto';
import { DriversService } from './drivers.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/role.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DriversController {
    constructor(private DriverService: DriversService) {}

    @Post('register')
    @Roles('driver')
    register(@Body() driverInfo: DriverPersonalInfo) {
        return this.DriverService.register(driverInfo);
    }
}
