import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { CurrentUser } from 'src/auth/decorators/current-users.decorator';
import { VehiclesService } from './vehicles.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/role.guard';
import { VehicleInfoDto } from 'src/vehicles/dto/vehicleInfo.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { VehicleDocumentDto } from './dto/vehicleDocument.dto';

@Controller('drivers/vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehiclesController {
    constructor(
        private vehiclesService: VehiclesService
    ) { }

    @Post("addVehicle")
    @Roles("driver")
    addVehicle(
        @CurrentUser() userInfo: any,
        @Body() dto: VehicleInfoDto,
    ) {
        return this.vehiclesService.addVehicle(userInfo.userId, dto)

    }

    @Get("displayVehicles")
    @Roles("driver")
    displayVehicles(
        @CurrentUser() userInfo,
    ) {
        return this.vehiclesService.displayVehicle(userInfo.userId)
    }

    @Patch(":driverId")
    updateVehicleInfo(
        @CurrentUser() userInfo,
        @Param("driverId") driverId: string,
        @Body() driverInfo: VehicleInfoDto
    ) {
        return this.vehiclesService.updateVehicleInfo(userInfo.userId, driverInfo)
    }

    //===== Vehicle Adding routes=====

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
        @CurrentUser() user: any,
        @UploadedFile() file: any,
        @Body() dto: VehicleDocumentDto,
    ) {
        return this.vehiclesService.uploadVehicleDocument(user.userId, file, dto)
    }

    @Get('documents')
    @Roles('driver')
    async getMyDocuments(@CurrentUser() user: any) {
        return this.vehiclesService.getVehicleDocuments(user.userId);
    }

    /**
     * Get a signed URL for viewing a specific document
     * URL is valid for 5 minutes for security
     */
    @Get('documents/:id/view')
    @Roles('driver')
    async viewDocument(
        @CurrentUser() user: any,
        @Param('id') documentId: string,
    ) {
        return this.vehiclesService.viewVehicleDocument(documentId, user.userId);
    }
}
