import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { DriverPersonalInfo } from 'src/dto/driverPersonalDetails.dto';
import { DriversService } from './drivers.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/role.guard';
import { VerifiedDriverGuard } from 'src/auth/guards/verified-driver.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { User } from 'src/users/entities/user.entity';
import { CurrentUser } from 'src/auth/decorators/current-users.decorator';
import { UpdateDriverProfileDto } from 'src/dto/update-driver.dto';
import { AddBankAccountDto, UpdateBankAccountDto } from 'src/dto/bank-account.dto';

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
    // get and update profile
    @Get('')
    @Roles('driver')
    getProfile(@CurrentUser() user: any) {
        return this.driverService.findById(user.userId);
    }
    @Patch("")
    @Roles("driver")
    updateProfile(@CurrentUser() user:any,
        @Body() driverInfo:UpdateDriverProfileDto){
        return this.driverService.updateProfile(user.userId, driverInfo)
    }

    /* add/update Bank details */
    @Post("addBankDetails")
    @Roles("driver")
    addBankDetails(
        @CurrentUser() user:any,
        @Body() dto:AddBankAccountDto
    ){
        return this.driverService.addBankDetails(user.userId,user.name,dto)
    }

    @Patch("updateBankDetails")
    @Roles("driver")
    updateBankDetails(
        @CurrentUser() user,
        @Body() dto:UpdateBankAccountDto
    ){
        return this.driverService.updateBankDetails(user.userId,user.name,dto)
    }

    //Driver Status toggling - Only verified drivers

    @Patch("status")
    @UseGuards(VerifiedDriverGuard)
    @Roles("driver")
    toggleStatus(
        @CurrentUser() user,
        @Body() dto:DriverPersonalInfo
    ){
        return this.driverService.toggleStatus(user.userId,dto);
    }

    @Patch("break")
    @UseGuards(VerifiedDriverGuard)
    @Roles("driver")
    setBreak(@CurrentUser() user: any){
        return this.driverService.setBreak(user.userId);
    }

    @Patch("resume")
    @UseGuards(VerifiedDriverGuard)
    @Roles("driver")
    resume(@CurrentUser() user: any){
        return this.driverService.resume(user.userId);
    }
}
