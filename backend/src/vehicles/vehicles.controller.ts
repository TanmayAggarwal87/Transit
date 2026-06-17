import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/auth/decorators/current-users.decorator';
import { VehiclesService } from './vehicles.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/role.guard';
import { VehicleInfoDto } from 'src/vehicles/dto/vehicleInfo.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('drivers/vehicles')
@UseGuards(JwtAuthGuard,RolesGuard)
export class VehiclesController {
    constructor(
        private vehiclesService:VehiclesService
    ){}

    @Post("addVehicle")
    @Roles("driver")
    addVehicle(
        @CurrentUser() userInfo:any,
        @Body() dto:VehicleInfoDto,
    ){
        return this.vehiclesService.addVehicle(userInfo.userId,dto)

    }

    @Get("displayVehicles")
    @Roles("driver")
    displayVehicles(
        @CurrentUser() userInfo,
    ){
        return this.vehiclesService.displayVehicle(userInfo.userId)
    }
    
    @Patch(":driverId")
    updateVehicleInfo(
        @CurrentUser() userInfo,
        @Param("driverId") driverId:string,
        @Body() driverInfo:VehicleInfoDto
    ){
        return this.vehiclesService.updateVehicleInfo(userInfo.userId,driverInfo)
    }
}
