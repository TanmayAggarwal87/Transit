import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { RidesService } from './rides.service';
import { PricingService } from './pricing.service';
import { EstimateFareDto } from './dto/estimate-fare.dto';
import { CreateRideDto } from './dto/create-ride.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-users.decorator';

@Controller('rides')
export class RidesController {
  constructor(
    private readonly ridesService: RidesService,
    private readonly pricingService: PricingService,
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


  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createRide(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateRideDto,
  ) {
    return this.ridesService.createRide(user.userId, dto);
  }
}
