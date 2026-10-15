import {
  ExecutionContext,
  ForbiddenException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/role.guard';
import { SupportController } from './support.controller';
import { AdminSupportController } from './admin-support.controller';
import { SupportService } from './support.service';
import {
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
} from './entities/support-ticket.entity';

describe('Support controllers HTTP routes', () => {
  let app: INestApplication;
  const mockSupportService = {
    createTicket: jest.fn().mockResolvedValue({ id: 'ticket-1' }),
    listUserTickets: jest.fn().mockResolvedValue({ tickets: [], total: 0 }),
    getTicketById: jest.fn().mockResolvedValue({ id: 'ticket-1' }),
    adminUpdateTicket: jest.fn().mockResolvedValue({ id: 'ticket-1' }),
    adminListTickets: jest.fn().mockResolvedValue({ tickets: [], total: 0 }),
    adminGetTicketById: jest.fn().mockResolvedValue({ id: 'ticket-1' }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [SupportController, AdminSupportController],
      providers: [
        { provide: SupportService, useValue: mockSupportService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest<{
            user: { userId: string; roles: string[] };
            headers: { authorization?: string };
          }>();
          const auth = req.headers.authorization;
          if (!auth) throw new UnauthorizedException();
          if (auth === 'Bearer admin-token') {
            req.user = { userId: 'admin-user-id', roles: ['admin'] };
            return true;
          }
          if (auth === 'Bearer rider-token') {
            req.user = { userId: 'rider-user-id', roles: ['rider'] };
            return true;
          }
          throw new UnauthorizedException();
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest<{
            user?: { roles?: string[] };
          }>();
          const roles = req.user?.roles ?? [];
          if (!roles.includes('admin')) {
            throw new ForbiddenException('Admin role required');
          }
          return true;
        },
      })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    await app.listen(0, '127.0.0.1');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /support/tickets', () => {
    it('rejects unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .post('/support/tickets')
        .send({
          subject: 'Lost wallet',
          description: 'I left my black leather wallet in the car.',
          category: SupportTicketCategory.LOST_ITEM,
        })
        .expect(401);
      expect(mockSupportService.createTicket).not.toHaveBeenCalled();
    });

    it('rejects invalid payloads with 400', async () => {
      // Too short subject
      await request(app.getHttpServer())
        .post('/support/tickets')
        .set('Authorization', 'Bearer rider-token')
        .send({
          subject: 'Hi',
          description: 'Valid description here',
          category: SupportTicketCategory.GENERAL,
        })
        .expect(400);

      // Invalid category
      await request(app.getHttpServer())
        .post('/support/tickets')
        .set('Authorization', 'Bearer rider-token')
        .send({
          subject: 'Valid Subject',
          description: 'Valid description here',
          category: 'invalid_category',
        })
        .expect(400);
    });

    it('creates a support ticket with valid payload', async () => {
      await request(app.getHttpServer())
        .post('/support/tickets')
        .set('Authorization', 'Bearer rider-token')
        .send({
          subject: 'Lost item in cab',
          description: 'Left my black backpack on the backseat.',
          category: SupportTicketCategory.LOST_ITEM,
          priority: SupportTicketPriority.HIGH,
        })
        .expect(201);

      expect(mockSupportService.createTicket).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'rider-user-id' }),
        expect.objectContaining({
          subject: 'Lost item in cab',
          category: SupportTicketCategory.LOST_ITEM,
          priority: SupportTicketPriority.HIGH,
        }),
      );
    });
  });

  describe('GET /support/tickets', () => {
    it('rejects unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get('/support/tickets')
        .expect(401);
    });

    it('lists own tickets with query parameters', async () => {
      await request(app.getHttpServer())
        .get('/support/tickets?page=2&limit=10&status=open')
        .set('Authorization', 'Bearer rider-token')
        .expect(200);

      expect(mockSupportService.listUserTickets).toHaveBeenCalledWith(
        'rider-user-id',
        expect.objectContaining({
          page: 2,
          limit: 10,
          status: SupportTicketStatus.OPEN,
        }),
      );
    });
  });

  describe('GET /support/tickets/:id', () => {
    it('rejects non-uuid IDs with 400', async () => {
      await request(app.getHttpServer())
        .get('/support/tickets/not-a-uuid')
        .set('Authorization', 'Bearer rider-token')
        .expect(400);
    });

    it('returns ticket for valid UUID', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      await request(app.getHttpServer())
        .get(`/support/tickets/${validUuid}`)
        .set('Authorization', 'Bearer rider-token')
        .expect(200);

      expect(mockSupportService.getTicketById).toHaveBeenCalledWith(
        validUuid,
        expect.objectContaining({ userId: 'rider-user-id' }),
      );
    });
  });

  describe('PATCH /admin/support/tickets/:id', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    it('rejects non-admin users with 403', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/support/tickets/${validUuid}`)
        .set('Authorization', 'Bearer rider-token')
        .send({ status: SupportTicketStatus.RESOLVED })
        .expect(403);
    });

    it('rejects invalid status enum with 400', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/support/tickets/${validUuid}`)
        .set('Authorization', 'Bearer admin-token')
        .send({ status: 'invalid_status' })
        .expect(400);
    });

    it('updates ticket status as admin', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/support/tickets/${validUuid}`)
        .set('Authorization', 'Bearer admin-token')
        .send({
          status: SupportTicketStatus.RESOLVED,
          resolutionNotes: 'Refund issued to original payment method.',
        })
        .expect(200);

      expect(mockSupportService.adminUpdateTicket).toHaveBeenCalledWith(
        validUuid,
        'admin-user-id',
        expect.objectContaining({
          status: SupportTicketStatus.RESOLVED,
          resolutionNotes: 'Refund issued to original payment method.',
        }),
      );
    });
  });

  describe('GET /admin/support/tickets', () => {
    it('allows admin to list all tickets across platform', async () => {
      await request(app.getHttpServer())
        .get('/admin/support/tickets?page=1&limit=50&status=in_progress')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(mockSupportService.adminListTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 50,
          status: SupportTicketStatus.IN_PROGRESS,
        }),
      );
    });
  });

  describe('GET /admin/support/tickets/:id', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    it('allows admin to get any ticket by UUID', async () => {
      await request(app.getHttpServer())
        .get(`/admin/support/tickets/${validUuid}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(mockSupportService.adminGetTicketById).toHaveBeenCalledWith(
        validUuid,
      );
    });
  });
});
