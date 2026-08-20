import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethod } from './entity/payment-method.entity';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { PaymentGatewayService } from './payment-gateway.service';

@Injectable()
export class PaymentMethodsService {
  constructor(
    @InjectRepository(PaymentMethod)
    private paymentMethodRepo: Repository<PaymentMethod>,
    private paymentGatewayService: PaymentGatewayService,
  ) {}

  async addPaymentMethod(userId: string, dto: CreatePaymentMethodDto): Promise<PaymentMethod> {
    const existingMethodsCount = await this.paymentMethodRepo.count({ where: { userId } });
    const isFirstMethod = existingMethodsCount === 0;
    const shouldBeDefault = dto.isDefault || isFirstMethod;

    const tokenResult = await this.paymentGatewayService.tokenizePaymentMethod({
      userId,
      type: dto.type,
      token: dto.token,
      last4: dto.last4,
      brand: dto.brand,
      expiryMonth: dto.expiryMonth,
      expiryYear: dto.expiryYear,
    });

    if (shouldBeDefault && !isFirstMethod) {
      await this.paymentMethodRepo.update({ userId }, { isDefault: false });
    }

    const paymentMethod = this.paymentMethodRepo.create({
      userId,
      type: tokenResult.type,
      gateway: tokenResult.gateway,
      gatewayToken: tokenResult.gatewayToken,
      last4: tokenResult.last4,
      brand: tokenResult.brand,
      expiryMonth: tokenResult.expiryMonth,
      expiryYear: tokenResult.expiryYear,
      isDefault: shouldBeDefault,
    });

    return await this.paymentMethodRepo.save(paymentMethod);
  }

  async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    return await this.paymentMethodRepo.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async deletePaymentMethod(userId: string, id: string): Promise<{ success: boolean; message: string }> {
    const method = await this.paymentMethodRepo.findOne({ where: { id, userId } });
    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    await this.paymentGatewayService.deleteGatewayToken(method.gatewayToken);
    await this.paymentMethodRepo.remove(method);

    if (method.isDefault) {
      const remainingMethods = await this.paymentMethodRepo.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
      if (remainingMethods.length > 0) {
        remainingMethods[0].isDefault = true;
        await this.paymentMethodRepo.save(remainingMethods[0]);
      }
    }

    return { success: true, message: 'Payment method deleted successfully' };
  }

  async setDefaultPaymentMethod(userId: string, id: string): Promise<PaymentMethod> {
    const method = await this.paymentMethodRepo.findOne({ where: { id, userId } });
    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    await this.paymentMethodRepo.update({ userId }, { isDefault: false });

    method.isDefault = true;
    return await this.paymentMethodRepo.save(method);
  }
}
