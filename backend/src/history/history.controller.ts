import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-users.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/role.guard';
import { HistoryService } from './history.service';
import {
  RideHistoryQueryDto,
  RiderInsightsQueryDto,
} from './dto/ride-history-query.dto';

const historyQueryValidation = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

@Controller('users/me')
@UseGuards(JwtAuthGuard)
export class RiderHistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get('rides')
  listRides(
    @CurrentUser() user: { userId: string },
    @Query(historyQueryValidation) query: RideHistoryQueryDto,
  ) {
    return this.historyService.listRiderRides(user.userId, query);
  }

  @Get('rides/:id')
  getRide(
    @CurrentUser() user: { userId: string },
    @Param('id', new ParseUUIDPipe()) rideId: string,
  ) {
    return this.historyService.getRiderRide(user.userId, rideId);
  }

  @Get('insights')
  getInsights(
    @CurrentUser() user: { userId: string },
    @Query(historyQueryValidation) query: RiderInsightsQueryDto,
  ) {
    return this.historyService.getRiderInsights(user.userId, query.months);
  }
}

@Controller('drivers/me')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DriverHistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get('rides')
  @Roles('driver')
  listRides(
    @CurrentUser() user: { userId: string },
    @Query(historyQueryValidation) query: RideHistoryQueryDto,
  ) {
    return this.historyService.listDriverRides(user.userId, query);
  }
}
