import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/role.guard';
import { UsersController } from '../users/users.controller';
import { UsersService } from '../users/users.service';
import {
  DriverHistoryController,
  RiderHistoryController,
} from './history.controller';
import { HistoryService } from './history.service';

describe('history HTTP routes', () => {
  let app: INestApplication;
  const historyService = {
    listRiderRides: jest.fn().mockResolvedValue({ items: [] }),
    listDriverRides: jest.fn().mockResolvedValue({ items: [] }),
    getRiderRide: jest.fn().mockResolvedValue({ id: 'ride' }),
    getRiderInsights: jest.fn().mockResolvedValue({ monthly: [] }),
  };
  const usersService = { findAll: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        UsersController,
        RiderHistoryController,
        DriverHistoryController,
      ],
      providers: [
        { provide: HistoryService, useValue: historyService },
        { provide: UsersService, useValue: usersService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest<{
            user: { userId: string };
            headers: { authorization?: string };
          }>();
          if (req.headers.authorization !== 'Bearer test-token')
            throw new UnauthorizedException();
          req.user = { userId: 'authenticated-user' };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    await app.init();
    await app.listen(0, '127.0.0.1');
  });

  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('protects rider history from anonymous requests', async () => {
    await request(app.getHttpServer()).get('/users/me/rides').expect(401);
    expect(historyService.listRiderRides).not.toHaveBeenCalled();
  });

  it('uses the signed-in user and validated defaults without colliding with /users/:id', async () => {
    await request(app.getHttpServer())
      .get('/users/me/rides?page=2&limit=10&category=EV')
      .set('Authorization', 'Bearer test-token')
      .expect(200);
    expect(historyService.listRiderRides).toHaveBeenCalledWith(
      'authenticated-user',
      expect.objectContaining({ page: 2, limit: 10, category: 'ev' }),
    );
    expect(usersService.findAll).not.toHaveBeenCalled();
  });

  it.each([
    'page=0',
    'limit=101',
    'page=1.5',
    'status=bogus',
    'category=bogus',
    'userId=other',
    'date_from=2026-02-30',
  ])('rejects invalid history queries: %s', async (query) => {
    await request(app.getHttpServer())
      .get(`/users/me/rides?${query}`)
      .set('Authorization', 'Bearer test-token')
      .expect(400);
    expect(historyService.listRiderRides).not.toHaveBeenCalled();
  });

  it('rejects invalid ride UUIDs before accessing the service', async () => {
    await request(app.getHttpServer())
      .get('/users/me/rides/not-a-uuid')
      .set('Authorization', 'Bearer test-token')
      .expect(400);
    expect(historyService.getRiderRide).not.toHaveBeenCalled();
  });

  it('validates the insight period and routes driver history independently', async () => {
    await request(app.getHttpServer())
      .get('/users/me/insights?months=25')
      .set('Authorization', 'Bearer test-token')
      .expect(400);
    await request(app.getHttpServer())
      .get('/users/me/insights?months=2')
      .set('Authorization', 'Bearer test-token')
      .expect(200);
    expect(historyService.getRiderInsights).toHaveBeenCalledWith(
      'authenticated-user',
      2,
    );
    await request(app.getHttpServer())
      .get('/drivers/me/rides')
      .set('Authorization', 'Bearer test-token')
      .expect(200);
    expect(historyService.listDriverRides).toHaveBeenCalledWith(
      'authenticated-user',
      expect.objectContaining({ page: 1, limit: 20 }),
    );
  });
});
