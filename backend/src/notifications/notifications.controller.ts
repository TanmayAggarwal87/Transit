import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-users.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getNotifications(
    @CurrentUser() user: { userId: string },
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.notificationsService.listForUser(user.userId, page, limit);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  markAllRead(@CurrentUser() user: { userId: string }) {
    return this.notificationsService.markAllRead(user.userId);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  markRead(
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) notificationId: string,
  ) {
    return this.notificationsService.markRead(user.userId, notificationId);
  }

  @Post('device-token')
  @HttpCode(HttpStatus.OK)
  registerDeviceToken(
    @CurrentUser() user: { userId: string },
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    if (!dto || typeof dto.token !== 'string') {
      throw new BadRequestException('Device token is required');
    }
    return this.notificationsService.registerDeviceToken(
      user.userId,
      dto.token,
      dto.platform,
    );
  }

  @Delete('device-token')
  @HttpCode(HttpStatus.OK)
  removeDeviceToken(
    @CurrentUser() user: { userId: string },
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    if (!dto || typeof dto.token !== 'string') {
      throw new BadRequestException('Device token is required');
    }
    return this.notificationsService.removeDeviceToken(user.userId, dto.token);
  }
}
