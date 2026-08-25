import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { RidesService } from './rides.service';
import { PricingService } from './pricing.service';
import { EstimateFareDto } from './dto/estimate-fare.dto';

@Controller('rides')
export class RidesController {
  constructor(
    private readonly ridesService: RidesService,
    private readonly pricingService: PricingService,
  ) {}

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
}
