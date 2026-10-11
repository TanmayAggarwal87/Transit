import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-users.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/role.guard';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { PaymentsService } from './payments.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('rides/:rideId/payment')
  getRidePayment(
    @CurrentUser() user: { userId: string },
    @Param('rideId') rideId: string,
  ) {
    return this.paymentsService.getRidePayment(user.userId, rideId);
  }

  @Post('rides/:rideId/payment/retry')
  retryRidePayment(
    @CurrentUser() user: { userId: string },
    @Param('rideId') rideId: string,
  ) {
    return this.paymentsService.retryRidePayment(user.userId, rideId);
  }

  @Post('rides/:rideId/payment/confirm')
  confirmRidePayment(
    @CurrentUser() user: { userId: string },
    @Param('rideId') rideId: string,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.paymentsService.confirmRidePayment(user.userId, rideId, dto);
  }

  @Get('users/me/payment-history')
  getPaymentHistory(
    @CurrentUser() user: { userId: string },
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.paymentsService.getPaymentHistory(user.userId, page, limit);
  }

  @Get('drivers/me/earnings')
  @UseGuards(RolesGuard)
  @Roles('driver')
  getEarningsSummary(@CurrentUser() user: { userId: string }) {
    return this.paymentsService.getEarningsSummary(user.userId);
  }

  @Get('drivers/me/earnings/breakdown')
  @UseGuards(RolesGuard)
  @Roles('driver')
  getEarningsBreakdown(
    @CurrentUser() user: { userId: string },
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.paymentsService.getEarningsBreakdown(user.userId, page, limit);
  }
}
