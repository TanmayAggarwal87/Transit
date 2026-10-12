import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RatingsService } from './ratings.service';

@Injectable()
export class RatingsScheduler {
  private readonly logger = new Logger(RatingsScheduler.name);

  constructor(private readonly ratingsService: RatingsService) {}

  @Cron('0 */15 * * * *')
  async refreshRollingRatings(): Promise<void> {
    try {
      await this.ratingsService.recomputeAllRatings();
    } catch (error) {
      this.logger.error(
        'Scheduled rating refresh failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
