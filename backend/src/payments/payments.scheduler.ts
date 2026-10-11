import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PaymentsService } from './payments.service';

@Injectable()
export class PaymentsScheduler {
  private readonly logger = new Logger(PaymentsScheduler.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Cron('0 2 * * 1', { timeZone: 'Asia/Kolkata' })
  async processWeeklyDriverPayouts(): Promise<void> {
    this.logger.log('Starting weekly driver payout run');
    await this.paymentsService.runWeeklyPayouts();
  }
}
