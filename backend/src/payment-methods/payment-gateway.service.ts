import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import { PaymentMethodType } from './entity/payment-method.entity';

export interface TokenizedPaymentResult {
  gatewayToken: string;
  gateway: string;
  type: PaymentMethodType;
  last4?: string;
  brand?: string;
  expiryMonth?: string;
  expiryYear?: string;
}

@Injectable()
export class PaymentGatewayService {
  private razorpay: Razorpay | null = null;
  private activeGateway: string;
  private readonly logger = new Logger(PaymentGatewayService.name);

  constructor(private configService: ConfigService) {
    this.activeGateway = this.configService.get<string>('PAYMENT_GATEWAY', 'razorpay');
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

    if (keyId && keySecret && keyId !== 'rzp_test_key_id') {
      try {
        this.razorpay = new Razorpay({
          key_id: keyId,
          key_secret: keySecret,
        });
      } catch (err) {
        this.logger.warn(`Failed to initialize Razorpay SDK: ${err}`);
      }
    }
  }

  async tokenizePaymentMethod(params: {
    userId: string;
    type: PaymentMethodType;
    token: string;
    last4?: string;
    brand?: string;
    expiryMonth?: string;
    expiryYear?: string;
  }): Promise<TokenizedPaymentResult> {
    const { type, token, last4, brand, expiryMonth, expiryYear } = params;

    if (this.activeGateway === 'razorpay' && this.razorpay) {
      try {
        return {
          gatewayToken: token,
          gateway: 'razorpay',
          type,
          last4: last4 || '4242',
          brand: brand || (type === PaymentMethodType.UPI ? 'UPI' : 'Visa'),
          expiryMonth,
          expiryYear,
        };
      } catch (error) {
        this.logger.error(`Razorpay tokenization error: ${error}`);
      }
    }

    return {
      gatewayToken: token.startsWith('tok_') ? token : `tok_${type}_${Date.now()}`,
      gateway: this.activeGateway,
      type,
      last4: last4 || (type === PaymentMethodType.UPI ? 'upi' : '4242'),
      brand: brand || (type === PaymentMethodType.UPI ? 'UPI' : 'Visa'),
      expiryMonth: expiryMonth || '12',
      expiryYear: expiryYear || '2030',
    };
  }

  async deleteGatewayToken(_gatewayToken: string): Promise<boolean> {
    return true;
  }
}
