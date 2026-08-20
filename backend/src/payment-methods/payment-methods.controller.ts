import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-users.decorator';
import { PaymentMethodsService } from './payment-methods.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';

@Controller('users/me/payment-methods')
@UseGuards(JwtAuthGuard)
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Post()
  addPaymentMethod(
    @CurrentUser() userInfo: { userId: string },
    @Body() dto: CreatePaymentMethodDto,
  ) {
    return this.paymentMethodsService.addPaymentMethod(userInfo.userId, dto);
  }

  @Get()
  getPaymentMethods(@CurrentUser() userInfo: { userId: string }) {
    return this.paymentMethodsService.getPaymentMethods(userInfo.userId);
  }

  @Delete(':id')
  deletePaymentMethod(
    @CurrentUser() userInfo: { userId: string },
    @Param('id') id: string,
  ) {
    return this.paymentMethodsService.deletePaymentMethod(userInfo.userId, id);
  }

  @Patch(':id/default')
  setDefaultPaymentMethod(
    @CurrentUser() userInfo: { userId: string },
    @Param('id') id: string,
  ) {
    return this.paymentMethodsService.setDefaultPaymentMethod(userInfo.userId, id);
  }
}
