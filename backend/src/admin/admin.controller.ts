import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CurrentUser } from 'src/auth/decorators/current-users.decorator';
import { VerifyDriverDocuments } from './dto/verify-driver-document.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/role.guard';
import { DocumentStatus } from 'src/drivers/entities/driver-document.entity';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
    constructor(
        private adminService:AdminService
    ){}

    @Patch("registerAdmin")
    addAdmin(
        @CurrentUser() userInfo:any,
    ){
        return this.adminService.addAdmin(userInfo.userId)
    }

    @Patch(":driverId/verify")
    @Roles("admin")
    verifyDriver(
        @Param("driverId") driverId:string,
        @CurrentUser() userInfo,
        @Body() dto:VerifyDriverDocuments
    ){
        return this.adminService.verifyDriver(driverId,userInfo.userId,dto);
    }

    @Patch(":driverId/vehicle/verify")
    @Roles("admin")
    verifyVehicle(
        @Param("driverId") driverId:string,
        @CurrentUser() userInfo,
        @Body('status') status: DocumentStatus
    ){
        return this.adminService.verifyVehicle(driverId,userInfo.userId,status);
    }


   
}
