import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-users.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafetyService } from './safety.service';

@Controller()
export class SafetyController {
  constructor(private readonly safetyService: SafetyService) {}

  @Post('rides/:id/sos')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  triggerSos(
    @CurrentUser() user: { userId: string },
    @Param('id') rideId: string,
  ) {
    return this.safetyService.triggerSos(user.userId, rideId);
  }

  @Patch('sos-alerts/:id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  resolveSos(
    @CurrentUser() user: { userId: string },
    @Param('id') alertId: string,
    @Body() body?: { note?: string },
  ) {
    const note = body?.note;
    if (note !== undefined && (note.length > 500 || note.trim().length === 0)) {
      throw new BadRequestException(
        'Resolution note must be 1 to 500 characters',
      );
    }
    return this.safetyService.resolveSos(alertId, user.userId, note?.trim());
  }

  @Post('rides/:id/share-trip')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  shareTrip(
    @CurrentUser() user: { userId: string },
    @Param('id') rideId: string,
  ) {
    return this.safetyService.createTripShare(user.userId, rideId);
  }

  @Get('rides/shared/:token')
  sharedTrip(@Param('token') token: string) {
    return this.safetyService.getSharedTrip(token);
  }
}
