import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RidesService } from './rides.service';
import { PricingService } from './pricing.service';
import { EstimateFareDto } from './dto/estimate-fare.dto';
import { CreateRideDto } from './dto/create-ride.dto';
import { RejectRideDto } from './dto/reject-ride.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/role.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CurrentUser } from 'src/auth/decorators/current-users.decorator';
import { DriversService } from 'src/drivers/drivers.service';

@Controller('rides')
export class RidesController {
  constructor(
    private readonly ridesService: RidesService,
    private readonly pricingService: PricingService,
    private readonly driversService: DriversService,
  ) {}

  /**
   * Public Endpoint: Get fare estimates for all vehicle categories
   */
  @Post('estimate')
  @HttpCode(HttpStatus.OK)
  async estimateFare(@Body() dto: EstimateFareDto) {
    return this.pricingService.estimateFare(
      dto.pickup_lat,
      dto.pickup_lng,
      dto.dest_lat,
      dto.dest_lng,
    );
  }

  /**
   * Protected Endpoint (Rider): Create a new ride request
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createRide(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateRideDto,
  ) {
    return this.ridesService.createRide(user.userId, dto);
  }

  /**
   * Protected Endpoint (Driver): Accept a dispatched ride
   */
  @Post(':id/accept')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('driver')
  @HttpCode(HttpStatus.OK)
  async acceptRide(
    @CurrentUser() user: any,
    @Param('id') rideId: string,
  ) {
    let driverId = user.driverId;
    if (!driverId) {
      const driver = await this.driversService.findByUserId(user.userId);
      driverId = driver?.id;
    }

    if (!driverId) {
      throw new ForbiddenException('Driver profile not found');
    }

    return this.ridesService.acceptRide(driverId, rideId);
  }

  /**
   * Protected Endpoint (Driver): Reject a dispatched ride
   */
  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('driver')
  @HttpCode(HttpStatus.OK)
  async rejectRide(
    @CurrentUser() user: any,
    @Param('id') rideId: string,
    @Body() dto: RejectRideDto,
  ) {
    let driverId = user.driverId;
    if (!driverId) {
      const driver = await this.driversService.findByUserId(user.userId);
      driverId = driver?.id;
    }

    if (!driverId) {
      throw new ForbiddenException('Driver profile not found');
    }

    return this.ridesService.rejectRide(driverId, rideId, dto?.reason);
  }
}
