import { Injectable } from '@nestjs/common';

@Injectable()
export class SmsService {
  async sendOtp(phone: string, otp: string): Promise<void> {
    // Mock SMS sending
    console.log(`[SMS] Sending OTP ${otp} to ${phone}`);

    // Example with Twilio (uncomment and configure when ready):
    // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // await client.messages.create({
    //   body: `Your OTP is: ${otp}. Valid for 5 minutes.`,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: phone,
    // });
  }
}
