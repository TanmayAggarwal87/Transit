import { IsString, Length } from 'class-validator';

export class ConfirmPaymentDto {
  @IsString()
  @Length(1, 80)
  razorpay_order_id!: string;

  @IsString()
  @Length(1, 80)
  razorpay_payment_id!: string;

  @IsString()
  @Length(64, 64)
  razorpay_signature!: string;
}
