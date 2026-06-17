import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CurrentUser } from 'src/auth/decorators/current-users.decorator';
import { userInfo } from 'os';
import { VerifyDriverDocuments } from './dto/verify-driver-document.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('admin')
export class AdminController {
    constructor(
        private adminService:AdminService
    ){}

    @Patch("registerAdmin")
    @UseGuards(JwtAuthGuard)
    addAdmin(
        @CurrentUser() userInfo:any,
    ){
        return this.adminService.addAdmin(userInfo.userId)
    }

   
}
