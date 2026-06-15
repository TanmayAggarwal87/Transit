import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DriverPersonalInfo } from 'src/dto/driverPersonalDetails.dto';
import { DriversService } from './drivers.service';
import { DriverDocumentsService } from './driver-documents.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/role.guard';
import { VerifiedDriverGuard } from 'src/auth/guards/verified-driver.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { User } from 'src/users/entities/user.entity';
import { CurrentUser } from 'src/auth/decorators/current-users.decorator';
import { UpdateDriverProfileDto } from 'src/dto/update-driver.dto';
import { AddBankAccountDto, UpdateBankAccountDto } from 'src/dto/bank-account.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';

@Controller('drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DriversController {
  constructor(
    private driverService: DriversService,
    private driverDocumentsService: DriverDocumentsService,
  ) {}

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

    /* Document Upload Endpoints */

    /**
     * Upload or replace a driver document
     * File validation: max 5MB, only JPEG/PNG/PDF
     */
    @Post('documents/upload')
    @Roles('driver')
    @UseInterceptors(
      FileInterceptor('file', {
        storage: undefined,
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
        fileFilter: (req, file, cb) => {
          const allowedMimes = [
            'image/jpeg',
            'image/png',
            'application/pdf',
          ];
          if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(
              new BadRequestException(
                'Only JPEG, PNG, and PDF files are allowed',
              ),
              false,
            );
          }
        },
      }),
    )
    async uploadDocument(
      @CurrentUser() user: User,
      @UploadedFile() file: any,
      @Body() dto: UploadDocumentDto,
    ) {
      return this.driverService.uploadDriverDocument(user.id, file, dto)
    }

    @Get('documents')
    @Roles('driver')
    async getMyDocuments(@CurrentUser() user: User) {
      return this.driverService.getDriverDocuments(user.id);
    }

    /**
     * Get a signed URL for viewing a specific document
     * URL is valid for 5 minutes for security
     */
    @Get('documents/:id/view')
    @Roles('driver')
    async viewDocument(
      @CurrentUser() user: User,
      @Param('id') documentId: string,
    ) {
      return this.driverService.viewDriverDocument(documentId, user.id);
    }
}
