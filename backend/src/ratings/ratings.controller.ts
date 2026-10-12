import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-users.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubmitRatingDto } from './dto/submit-rating.dto';
import { RatingsService } from './ratings.service';

@Controller()
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post('rides/:id/rate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  submitRating(
    @Param('id', ParseUUIDPipe) rideId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: SubmitRatingDto,
  ) {
    return this.ratingsService.submitRating(rideId, user, dto.score);
  }

  @Get('drivers/:id/rating')
  getDriverRating(@Param('id', ParseUUIDPipe) driverId: string) {
    return this.ratingsService.getDriverRating(driverId);
  }
}
