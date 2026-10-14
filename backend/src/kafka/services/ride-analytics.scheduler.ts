import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RideAnalyticsService } from './ride-analytics.service';

@Injectable()
export class RideAnalyticsScheduler {
  private readonly logger = new Logger(RideAnalyticsScheduler.name);
  private running = false;

  constructor(private readonly analyticsService: RideAnalyticsService) {}

  @Cron('0 */5 * * * *')
  async catchUpAnalytics(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.analyticsService.backfillMissingAnalytics();
    } catch (error) {
      this.logger.error(
        'Analytics catch-up failed',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.running = false;
    }
  }
}
