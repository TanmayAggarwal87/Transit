import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class RealtimeService {
  private server?: Server;

  attachServer(server: Server): void {
    this.server = server;
  }

  emitToRide(rideId: string, event: string, payload: unknown): void {
    this.server?.to(`ride:${rideId}`).emit(event, payload);
  }

  emitToDriver(driverId: string, event: string, payload: unknown): void {
    this.server?.to(`driver:${driverId}`).emit(event, payload);
  }
}
