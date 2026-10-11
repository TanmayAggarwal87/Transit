import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import axios from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';
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

export interface RazorpayPayoutResult {
  id: string;
  status: string;
}

@Injectable()
export class PaymentGatewayService {
  private razorpay: Razorpay | null = null;
  private activeGateway: string;
  private keyId?: string;
  private keySecret?: string;
  private readonly logger = new Logger(PaymentGatewayService.name);

  constructor(private configService: ConfigService) {
    this.activeGateway = this.configService.get<string>('PAYMENT_GATEWAY', 'razorpay');
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    this.keyId = keyId;
    this.keySecret = keySecret;

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

  getCheckoutKeyId(): string | undefined {
    return this.keyId;
  }

  async createOrder(params: {
    amountPaise: number;
    receipt: string;
    notes: Record<string, string>;
  }): Promise<{ id: string }> {
    if (!this.razorpay || this.activeGateway !== 'razorpay') {
      throw new Error('Razorpay checkout is not configured');
    }
    return this.razorpay.orders.create({
      amount: params.amountPaise,
      currency: 'INR',
      receipt: params.receipt.slice(0, 40),
      notes: params.notes,
    });
  }

  verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
    if (!this.keySecret || !/^[a-f0-9]{64}$/i.test(signature)) return false;
    const expected = createHmac('sha256', this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest();
    const received = Buffer.from(signature, 'hex');
    return received.length === expected.length && timingSafeEqual(received, expected);
  }

  async fetchPayment(paymentId: string) {
    if (!this.razorpay) throw new Error('Razorpay checkout is not configured');
    return this.razorpay.payments.fetch(paymentId);
  }

  async capturePayment(paymentId: string, amountPaise: number) {
    if (!this.razorpay) throw new Error('Razorpay checkout is not configured');
    return this.razorpay.payments.capture(paymentId, amountPaise, 'INR');
  }

  async createBankPayout(params: {
    payoutId: string;
    driverId: string;
    amountPaise: number;
    accountNumber: string;
    accountHolderName: string;
    ifscCode: string;
    email: string;
    phone: string;
  }): Promise<RazorpayPayoutResult> {
    const keyId = this.configService.get<string>('RAZORPAYX_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAYX_KEY_SECRET');
    const sourceAccount = this.configService.get<string>('RAZORPAYX_ACCOUNT_NUMBER');
    if (!keyId || !keySecret || !sourceAccount) {
      throw new Error('RazorpayX payout credentials are not configured');
    }
    const response = await axios.post<RazorpayPayoutResult>(
      'https://api.razorpay.com/v1/payouts',
      {
        account_number: sourceAccount,
        amount: params.amountPaise,
        currency: 'INR',
        mode: 'IMPS',
        purpose: 'payout',
        queue_if_low_balance: true,
        reference_id: params.payoutId,
        narration: 'Transit driver payout',
        fund_account: {
          account_type: 'bank_account',
          bank_account: {
            name: params.accountHolderName,
            ifsc: params.ifscCode,
            account_number: params.accountNumber,
          },
          contact: {
            name: params.accountHolderName,
            email: params.email,
            contact: params.phone,
            type: 'employee',
            reference_id: params.driverId,
          },
        },
      },
      {
        auth: { username: keyId, password: keySecret },
        headers: { 'X-Payout-Idempotency': params.payoutId },
        timeout: 15_000,
      },
    );
    return response.data;
  }

  async fetchBankPayout(payoutId: string): Promise<RazorpayPayoutResult> {
    const keyId = this.configService.get<string>('RAZORPAYX_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAYX_KEY_SECRET');
    if (!keyId || !keySecret) {
      throw new Error('RazorpayX payout credentials are not configured');
    }
    const response = await axios.get<RazorpayPayoutResult>(
      `https://api.razorpay.com/v1/payouts/${encodeURIComponent(payoutId)}`,
      { auth: { username: keyId, password: keySecret }, timeout: 15_000 },
    );
    return response.data;
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
