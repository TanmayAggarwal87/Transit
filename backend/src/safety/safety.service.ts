import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { Repository } from 'typeorm';
import { NotificationsService } from '../notifications/notifications.service';
import { RedisService } from '../redis/redis.service';
import { RealtimeService } from '../realtime/realtime.service';
import { Ride, RideStatus } from '../rides/entities/ride.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { User } from '../users/entities/user.entity';
import { SosAlert, SosAlertStatus } from './entities/sos-alert.entity';

const ACTIVE_RIDE_STATUSES = [
  RideStatus.REQUESTED,
  RideStatus.SEARCHING,
  RideStatus.DRIVER_ASSIGNED,
  RideStatus.DRIVER_ARRIVED,
  RideStatus.IN_PROGRESS,
];
const SHARE_TOKEN_TTL_SECONDS = 4 * 60 * 60;
const MAX_LOCATION_AGE_MS = 2 * 60 * 1000;

interface RideLocation {
  lat: number;
  lng: number;
  updatedAt: Date;
}

@Injectable()
export class SafetyService {
  private readonly logger = new Logger(SafetyService.name);

  constructor(
    @InjectRepository(SosAlert)
    private readonly sosAlertRepository: Repository<SosAlert>,
    @InjectRepository(Ride)
    private readonly rideRepository: Repository<Ride>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeService: RealtimeService,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async triggerSos(userId: string, rideId: string) {
    const ride = await this.rideRepository.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (!ACTIVE_RIDE_STATUSES.includes(ride.status)) {
      throw new ConflictException('SOS is only available for an active ride');
    }

    const actorRole = await this.getParticipantRole(ride, userId);
    const existing = await this.sosAlertRepository.findOne({
      where: { rideId, triggeredByUserId: userId, status: SosAlertStatus.OPEN },
      order: { createdAt: 'DESC' },
    });
    if (existing) return this.serializeAlert(existing, true);

    const location = ride.driverId
      ? await this.getCurrentRideLocation(ride.driverId)
      : null;
    let alert: SosAlert;
    try {
      alert = await this.sosAlertRepository.save(
        this.sosAlertRepository.create({
          rideId,
          triggeredByUserId: userId,
          triggeredByRole: actorRole,
          status: SosAlertStatus.OPEN,
          lat: location?.lat ?? null,
          lng: location?.lng ?? null,
          smsSent: false,
          opsAlertSent: false,
          resolvedByUserId: null,
          resolvedAt: null,
          resolutionNote: null,
        }),
      );
    } catch (error) {
      const databaseCode = (error as { driverError?: { code?: string } })
        ?.driverError?.code;
      if (databaseCode !== '23505') throw error;
      const concurrentAlert = await this.sosAlertRepository.findOne({
        where: {
          rideId,
          triggeredByUserId: userId,
          status: SosAlertStatus.OPEN,
        },
        order: { createdAt: 'DESC' },
      });
      if (!concurrentAlert) throw error;
      return this.serializeAlert(concurrentAlert, true);
    }

    const [smsSent, opsAlertSent] = await Promise.all([
      this.notifyEmergencyContact(ride, userId, location),
      this.notifyOperations(ride, alert.id, actorRole, location),
    ]);

    alert.smsSent = smsSent;
    alert.opsAlertSent = opsAlertSent;
    const savedAlert = await this.sosAlertRepository.save(alert);

    const event = {
      alertId: savedAlert.id,
      rideId,
      status: savedAlert.status,
      triggeredByRole: actorRole,
      location: location
        ? {
            lat: location.lat,
            lng: location.lng,
            updatedAt: location.updatedAt,
          }
        : null,
      createdAt: savedAlert.createdAt,
    };
    this.realtimeService.emitToRide(rideId, 'sos:triggered', event);
    if (ride.riderId !== userId) {
      this.realtimeService.emitToUser(ride.riderId, 'sos:triggered', event);
    }

    this.logger.warn(`SOS alert ${savedAlert.id} created for ride ${rideId}`);
    return {
      ...this.serializeAlert(savedAlert, false),
      emergencyContactNotified: smsSent,
      operationsNotified: opsAlertSent,
    };
  }

  async resolveSos(alertId: string, adminUserId: string, note?: string) {
    const alert = await this.sosAlertRepository.findOne({
      where: { id: alertId },
    });
    if (!alert) throw new NotFoundException('SOS alert not found');
    if (alert.status === SosAlertStatus.RESOLVED) return alert;

    alert.status = SosAlertStatus.RESOLVED;
    alert.resolvedByUserId = adminUserId;
    alert.resolvedAt = new Date();
    alert.resolutionNote = note ?? null;
    const saved = await this.sosAlertRepository.save(alert);
    this.realtimeService.emitToRide(alert.rideId, 'sos:resolved', {
      alertId: alert.id,
      rideId: alert.rideId,
      status: alert.status,
      resolvedAt: alert.resolvedAt,
    });
    return saved;
  }

  async createTripShare(userId: string, rideId: string) {
    const ride = await this.rideRepository.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    await this.getParticipantRole(ride, userId);
    if (!ACTIVE_RIDE_STATUSES.includes(ride.status)) {
      throw new ConflictException(
        'Trip sharing is only available for an active ride',
      );
    }

    const baseUrl = this.configService
      .get<string>('PUBLIC_API_BASE_URL')
      ?.trim();
    if (!baseUrl) {
      throw new ServiceUnavailableException('Trip sharing is not configured');
    }
    let parsedBase: URL;
    try {
      parsedBase = new URL(baseUrl);
    } catch {
      throw new ServiceUnavailableException('Trip sharing is not configured');
    }
    if (parsedBase.protocol !== 'https:') {
      throw new ServiceUnavailableException('Trip sharing is not configured');
    }

    const token = await this.jwtService.signAsync(
      { purpose: 'trip-share', rideId },
      { expiresIn: SHARE_TOKEN_TTL_SECONDS },
    );
    parsedBase.pathname = `${parsedBase.pathname.replace(/\/$/, '')}/rides/shared/${encodeURIComponent(token)}`;
    parsedBase.search = '';
    parsedBase.hash = '';
    return {
      url: parsedBase.toString(),
      expiresAt: new Date(
        Date.now() + SHARE_TOKEN_TTL_SECONDS * 1000,
      ).toISOString(),
    };
  }

  async getSharedTrip(token: string) {
    let payload: { purpose?: string; rideId?: string };
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Trip share link is invalid or expired');
    }
    if (
      payload.purpose !== 'trip-share' ||
      typeof payload.rideId !== 'string'
    ) {
      throw new UnauthorizedException('Trip share link is invalid or expired');
    }

    const ride = await this.rideRepository.findOne({
      where: { id: payload.rideId },
    });
    if (!ride || !ACTIVE_RIDE_STATUSES.includes(ride.status)) {
      throw new NotFoundException('Shared trip is no longer active');
    }
    const location = ride.driverId
      ? await this.getCurrentRideLocation(ride.driverId)
      : null;
    return {
      rideId: ride.id,
      status: ride.status,
      location: location
        ? {
            lat: location.lat,
            lng: location.lng,
            updatedAt: location.updatedAt,
          }
        : null,
      locationAvailable: Boolean(location),
    };
  }

  private async getParticipantRole(
    ride: Ride,
    userId: string,
  ): Promise<'rider' | 'driver'> {
    if (ride.riderId === userId) return 'rider';
    if (ride.driverId) {
      const driver = await this.driverRepository.findOne({
        where: { id: ride.driverId, userId },
        select: ['id'],
      });
      if (driver) return 'driver';
    }
    throw new ForbiddenException(
      'Only a rider or assigned driver can access this ride',
    );
  }

  private async getCurrentRideLocation(
    driverId: string,
  ): Promise<RideLocation | null> {
    try {
      const location = await this.redisService.getDriverLocation(driverId);
      if (
        !location ||
        !Number.isFinite(location.lat) ||
        !Number.isFinite(location.lng) ||
        location.lat < -90 ||
        location.lat > 90 ||
        location.lng < -180 ||
        location.lng > 180
      ) {
        return null;
      }
      const updatedAt = new Date(location.updatedAt);
      const ageMs = Date.now() - updatedAt.getTime();
      if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > MAX_LOCATION_AGE_MS) {
        return null;
      }
      return { lat: location.lat, lng: location.lng, updatedAt };
    } catch (error) {
      this.logger.warn(
        `Could not retrieve live driver location: ${this.errorCode(error)}`,
      );
      return null;
    }
  }

  private async notifyEmergencyContact(
    ride: Ride,
    actorUserId: string,
    location: RideLocation | null,
  ): Promise<boolean> {
    const actor = await this.userRepository.findOne({
      where: { id: actorUserId },
      select: ['id', 'name', 'emergencyContact'],
    });
    const contact = actor?.emergencyContact?.trim();
    if (!actor || !contact) return false;
    const mapLink = location
      ? ` https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`
      : '';
    const message = `Transit SOS: ${actor.name} requested help during ride ${ride.id}.${mapLink}`;
    return this.notificationsService.sendSms(contact, message);
  }

  private async notifyOperations(
    ride: Ride,
    alertId: string,
    actorRole: 'rider' | 'driver',
    location: RideLocation | null,
  ): Promise<boolean> {
    const configuredUrl = this.configService
      .get<string>('OPS_SOS_WEBHOOK_URL')
      ?.trim();
    if (!configuredUrl) {
      this.logger.warn(
        `SOS alert ${alertId} was created; operations webhook is not configured`,
      );
      return false;
    }
    let webhook: URL;
    try {
      webhook = new URL(configuredUrl);
    } catch {
      this.logger.error('SOS operations webhook URL is invalid');
      return false;
    }
    if (webhook.protocol !== 'https:') {
      this.logger.error('SOS operations webhook must use HTTPS');
      return false;
    }

    try {
      const locationLine = location
        ? `\nLocation: https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`
        : '\nLocation: current coordinates are unavailable';
      await axios.post(
        webhook.toString(),
        {
          text: `🚨 Transit SOS alert ${alertId}\nRide: ${ride.id}\nTriggered by: ${actorRole}${locationLine}`,
        },
        { timeout: 5000, maxRedirects: 0 },
      );
      return true;
    } catch (error) {
      this.logger.error(
        `SOS operations webhook delivery failed: ${this.errorCode(error)}`,
      );
      return false;
    }
  }

  private serializeAlert(alert: SosAlert, alreadyOpen: boolean) {
    return {
      id: alert.id,
      rideId: alert.rideId,
      status: alert.status,
      alreadyOpen,
      createdAt: alert.createdAt,
    };
  }

  private errorCode(error: unknown): string {
    if (axios.isAxiosError(error))
      return error.code ?? `HTTP_${error.response?.status ?? 'ERROR'}`;
    return error instanceof Error ? error.name : 'UNKNOWN_ERROR';
  }
}
