import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import {
  applicationDefault,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { Repository } from 'typeorm';
import { DeviceToken } from './entities/device-token.entity';
import { InAppNotification } from './entities/in-app-notification.entity';

export interface NotificationContent {
  type: string;
  title: string;
  body: string;
  deepLink?: string;
  data?: Record<string, string>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly messaging?: Messaging;
  private pushDisabledWarningLogged = false;
  private smsDisabledWarningLogged = false;

  constructor(
    @InjectRepository(InAppNotification)
    private readonly notificationRepository: Repository<InAppNotification>,
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepository: Repository<DeviceToken>,
    private readonly configService: ConfigService,
  ) {
    this.messaging = this.createMessagingClient();
  }

  async saveInApp(
    userId: string,
    type: string,
    title: string,
    body: string,
    deepLink?: string,
    data?: Record<string, string>,
  ): Promise<InAppNotification> {
    return this.notificationRepository.save(
      this.notificationRepository.create({
        userId,
        type: type.slice(0, 80),
        title: title.slice(0, 160),
        body,
        deepLink: deepLink?.slice(0, 512) ?? null,
        data: data ?? null,
        isRead: false,
        readAt: null,
      }),
    );
  }

  async notifyUser(userId: string, content: NotificationContent): Promise<void> {
    try {
      await this.saveInApp(
        userId,
        content.type,
        content.title,
        content.body,
        content.deepLink,
        content.data,
      );
    } catch (error) {
      this.logger.error(
        `Could not save in-app notification for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    try {
      const tokens = await this.deviceTokenRepository.find({
        where: { userId },
        select: { id: true, token: true },
      });
      await Promise.all(
        tokens.map(({ id, token }) =>
          this.sendPush(token, content.title, content.body, {
            ...(content.data ?? {}),
            ...(content.deepLink ? { deepLink: content.deepLink } : {}),
          }).then((sent) => {
            if (!sent) return;
            return undefined;
          }).catch((error: unknown) => {
            this.logger.warn(
              `Push notification failed for device ${id}: ${this.errorCode(error)}`,
            );
          }),
        ),
      );
    } catch (error) {
      this.logger.error(
        `Could not deliver push notifications for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async sendPush(
    deviceToken: string,
    title: string,
    body: string,
    data: Record<string, string> = {},
  ): Promise<boolean> {
    if (!this.messaging) {
      if (!this.pushDisabledWarningLogged) {
        this.logger.warn(
          'FCM is not configured; push delivery is disabled until Firebase credentials are configured',
        );
        this.pushDisabledWarningLogged = true;
      }
      return false;
    }

    try {
      await this.messaging.send({
        token: deviceToken,
        notification: { title, body },
        data: this.firebaseData(data),
      });
      return true;
    } catch (error) {
      const code = this.errorCode(error);
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        await this.deviceTokenRepository.delete({ token: deviceToken });
      } else {
        this.logger.warn(`FCM delivery failed: ${code}`);
      }
      return false;
    }
  }

  async sendSms(phone: string, message: string): Promise<boolean> {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const apiKeySid = this.configService.get<string>('TWILIO_API_KEY_SID');
    const apiKeySecret = this.configService.get<string>('TWILIO_API_KEY_SECRET');
    const from = this.configService.get<string>('TWILIO_PHONE_NUMBER');
    if (!accountSid || !apiKeySid || !apiKeySecret || !from) {
      if (!this.smsDisabledWarningLogged) {
        this.logger.warn(
          'Twilio SMS is not configured; SMS delivery is disabled until Twilio credentials are configured',
        );
        this.smsDisabledWarningLogged = true;
      }
      return false;
    }
    if (
      !/^\+[1-9]\d{7,14}$/.test(phone) ||
      !message.trim() ||
      message.length > 1600
    ) {
      return false;
    }

    const form = new URLSearchParams({ To: phone, From: from, Body: message });
    try {
      await axios.post(
          `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
          form.toString(),
          {
            auth: { username: apiKeySid, password: apiKeySecret },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 10_000,
          },
      );
      return true;
    } catch (error) {
      this.logger.warn(`Twilio SMS delivery failed: ${this.errorCode(error)}`);
      return false;
    }
  }

  async listForUser(userId: string, page = 1, limit = 20) {
    const pagination = this.pagination(page, limit);
    const [items, total] = await this.notificationRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: pagination.skip,
      take: pagination.limit,
    });
    return {
      items,
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await this.notificationRepository.save(notification);
    }
    return notification;
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    return { updated: result.affected ?? 0 };
  }

  async registerDeviceToken(
    userId: string,
    rawToken: string,
    platform?: string,
  ): Promise<{ registered: true }> {
    if (typeof rawToken !== 'string') {
      throw new BadRequestException('Invalid device token');
    }
    const token = rawToken.trim();
    if (
      !token ||
      token.length > 4096 ||
      (platform !== undefined && !['android', 'ios', 'web'].includes(platform))
    ) {
      throw new BadRequestException('Invalid device token');
    }
    await this.deviceTokenRepository.upsert(
      { userId, token, platform: platform ?? null },
      ['token'],
    );
    return { registered: true };
  }

  async removeDeviceToken(userId: string, rawToken: string): Promise<{ removed: boolean }> {
    if (typeof rawToken !== 'string') {
      throw new BadRequestException('Invalid device token');
    }
    const result = await this.deviceTokenRepository.delete({
      userId,
      token: rawToken.trim(),
    });
    return { removed: (result.affected ?? 0) > 0 };
  }

  private createMessagingClient(): Messaging | undefined {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const credentialsFile = this.configService.get<string>(
      'GOOGLE_APPLICATION_CREDENTIALS',
    );
    if (!projectId && !credentialsFile) return undefined;

    try {
      const existingApp = getApps().find((app) => app.name === 'transit-notifications');
      const app = existingApp ?? initializeApp(
        {
          credential: applicationDefault(),
          ...(projectId ? { projectId } : {}),
        },
        'transit-notifications',
      );
      return getMessaging(app);
    } catch (error) {
      this.logger.warn(`Could not initialize FCM: ${this.errorCode(error)}`);
      return undefined;
    }
  }

  private firebaseData(data: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(data)
        .filter(([key, value]) =>
          /^[a-zA-Z0-9_-]{1,128}$/.test(key) &&
          !key.startsWith('google') &&
          !key.startsWith('gcm') &&
          typeof value === 'string',
        )
        .map(([key, value]) => [key, value.slice(0, 1024)]),
    );
  }

  private pagination(page: number, limit: number) {
    const safePage = Number.isInteger(page) && page > 0 ? Math.min(page, 1_000_000) : 1;
    const safeLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 100) : 20;
    return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
  }

  private errorCode(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      return String((error as { code?: unknown }).code ?? 'unknown-error');
    }
    return 'unknown-error';
  }
}
