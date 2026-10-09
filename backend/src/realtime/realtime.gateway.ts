import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { forwardRef, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createClient, RedisClientType } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { In, Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { JWT_SECRET } from '../auth/constants/jwt.constants';
import { DriversService } from '../drivers/drivers.service';
import { UpdateDriverLocationDto } from '../drivers/dto/update-location.dto';
import { Ride, RideStatus } from '../rides/entities/ride.entity';
import { RidesService } from '../rides/rides.service';
import { RedisService } from '../redis/redis.service';
import { RealtimeService } from './realtime.service';

interface AuthenticatedSocket extends Socket {
  data: Socket['data'] & {
    userId: string;
    driverId?: string;
    roles: string[];
  };
}

const ACTIVE_RIDE_STATUSES = [
  RideStatus.REQUESTED,
  RideStatus.SEARCHING,
  RideStatus.DRIVER_ASSIGNED,
  RideStatus.DRIVER_ARRIVED,
  RideStatus.IN_PROGRESS,
];

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: process.env.WS_CORS_ORIGIN?.split(',') ?? false,
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  private readonly logger = new Logger(RealtimeGateway.name);
  private pubClient?: RedisClientType;
  private subClient?: RedisClientType;

  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly driversService: DriversService,
    @Inject(forwardRef(() => RidesService))
    private readonly ridesService: RidesService,
    private readonly redisService: RedisService,
    @InjectRepository(Ride)
    private readonly rideRepository: Repository<Ride>,
    private readonly realtimeService: RealtimeService,
  ) {}

  async afterInit(server: Server): Promise<void> {
    this.realtimeService.attachServer(server);

    const redisUrl =
      this.configService.get<string>('REDIS_URL') ||
      `redis://${this.configService.get<string>('REDIS_HOST', 'localhost')}:${this.configService.get<number>('REDIS_PORT', 6379)}`;
    this.pubClient = createClient({ url: redisUrl });
    this.subClient = this.pubClient.duplicate();

    this.pubClient.on('error', (error) =>
      this.logger.error(`WebSocket Redis publisher error: ${error.message}`),
    );
    this.subClient.on('error', (error) =>
      this.logger.error(`WebSocket Redis subscriber error: ${error.message}`),
    );

    try {
      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
      server.adapter(createAdapter(this.pubClient, this.subClient));
      this.logger.log('Socket.IO Redis adapter connected');
    } catch (error) {
      this.logger.error(
        `Socket.IO Redis adapter unavailable; this instance will use local rooms: ${(error as Error).message}`,
      );
    }
  }

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const token = this.getHandshakeToken(client);
      if (!token) {
        throw new Error('Missing access token');
      }

      const payload = await this.jwtService.verifyAsync<{
        sub?: string;
        roles?: string | string[];
        type?: string;
      }>(token, {
        secret: this.configService.get<string>('JWT_SECRET') || JWT_SECRET,
      });

      if (!payload.sub || payload.type === 'onboarding') {
        throw new Error('Invalid access token');
      }

      client.data.userId = payload.sub;
      client.data.roles = this.parseRoles(payload.roles);

      const driver = await this.driversService.findByUserId(payload.sub);
      if (driver) {
        client.data.driverId = driver.id;
        await client.join(`driver:${driver.id}`);
      }

      const activeRides = await this.rideRepository.find({
        where: [
          { riderId: payload.sub, status: In(ACTIVE_RIDE_STATUSES) },
          ...(driver
            ? [{ driverId: driver.id, status: In(ACTIVE_RIDE_STATUSES) }]
            : []),
        ],
        select: ['id'],
      });
      await client.join(activeRides.map((ride) => `ride:${ride.id}`));
    } catch (error) {
      this.logger.debug(`Rejected WebSocket connection: ${(error as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    this.logger.debug(`WebSocket disconnected: ${client.id}`);
  }

  @SubscribeMessage('driver:location_ping')
  async handleLocationPing(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: Partial<UpdateDriverLocationDto>,
  ) {
    if (!client.data.driverId) {
      return { success: false, message: 'Driver account required' };
    }
    if (
      !Number.isFinite(body.lat) ||
      !Number.isFinite(body.lng) ||
      body.lat! < -90 ||
      body.lat! > 90 ||
      body.lng! < -180 ||
      body.lng! > 180 ||
      (body.heading !== undefined && !Number.isFinite(body.heading)) ||
      (body.speed_kmh !== undefined &&
        (!Number.isFinite(body.speed_kmh) || body.speed_kmh < 0))
    ) {
      return { success: false, message: 'Invalid location payload' };
    }

    const activeRide = await this.rideRepository.findOne({
      where: {
        driverId: client.data.driverId,
        status: In(ACTIVE_RIDE_STATUSES),
      },
      select: ['id'],
    });
    if (body.ride_id && body.ride_id !== activeRide?.id) {
      return { success: false, message: 'Ride does not belong to this driver' };
    }

    const location: UpdateDriverLocationDto = {
      lat: body.lat!,
      lng: body.lng!,
      heading: body.heading,
      speed_kmh: body.speed_kmh,
      ride_id: activeRide?.id,
    };
    return this.driversService.updateDriverLocation(client.data.userId, location);
  }

  @SubscribeMessage('ride:subscribe')
  async handleRideSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { rideId?: string },
  ) {
    if (!body?.rideId) {
      return { success: false, message: 'rideId is required' };
    }
    const ride = await this.rideRepository.findOne({
      where: [
        { id: body.rideId, riderId: client.data.userId },
        ...(client.data.driverId
          ? [{ id: body.rideId, driverId: client.data.driverId }]
          : []),
      ],
      select: ['id'],
    });
    if (!ride) {
      return { success: false, message: 'Ride not found for this account' };
    }
    await client.join(`ride:${ride.id}`);
    return { success: true, rideId: ride.id };
  }

  @SubscribeMessage('driver:dispatch_response')
  async handleDispatchResponse(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { rideId?: string; accepted?: boolean; reason?: string },
  ) {
    if (!client.data.driverId) {
      return { success: false, message: 'Driver account required' };
    }
    if (!body?.rideId || typeof body.accepted !== 'boolean') {
      return { success: false, message: 'rideId and accepted are required' };
    }
    const pendingDispatch = await this.redisService.getRideCache<{
      driverId: string;
    }>(`dispatch:pending:${body.rideId}`);
    if (pendingDispatch?.driverId !== client.data.driverId) {
      return { success: false, message: 'Dispatch is no longer assigned to this driver' };
    }

    if (body.accepted) {
      const ride = await this.ridesService.acceptRide(
        client.data.driverId,
        body.rideId,
      );
      await client.join(`ride:${ride.id}`);
      return { success: true, rideId: ride.id, status: ride.status };
    }

    return this.ridesService.rejectRide(
      client.data.driverId,
      body.rideId,
      body.reason,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(
      [this.pubClient, this.subClient]
        .filter((client): client is RedisClientType => Boolean(client?.isOpen))
        .map((client) => client.quit()),
    );
  }

  private getHandshakeToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const authorization = client.handshake.headers.authorization;
    const match = authorization?.match(/^Bearer\s+(.+)$/i);
    return match?.[1];
  }

  private parseRoles(roles?: string | string[]): string[] {
    if (Array.isArray(roles)) return roles;
    if (!roles) return [];
    try {
      const parsed: unknown = JSON.parse(roles);
      return Array.isArray(parsed) ? parsed.filter((role) => typeof role === 'string') : [];
    } catch {
      return roles.split(',').map((role) => role.trim()).filter(Boolean);
    }
  }
}
