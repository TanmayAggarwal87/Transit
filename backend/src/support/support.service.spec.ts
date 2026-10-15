import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  SupportTicket,
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
} from './entities/support-ticket.entity';
import { SupportService } from './support.service';

describe('SupportService', () => {
  let service: SupportService;
  let supportTicketRepository: any;
  let rideRepository: any;
  let userRepository: any;
  let driverRepository: any;
  let notificationsService: any;

  const mockUser = {
    userId: 'user-123',
    roles: ['rider'],
  };

  const mockAdminUser = {
    userId: 'admin-999',
    roles: ['admin'],
  };

  const mockDriverUser = {
    userId: 'driver-user-456',
    roles: ['driver'],
  };

  const mockRide = {
    id: 'ride-abc',
    riderId: 'user-123',
    driverId: 'driver-rec-456',
  };

  const mockTicket: Partial<SupportTicket> = {
    id: 'ticket-1',
    ticketNumber: 'TKT-TEST-001',
    userId: 'user-123',
    userRole: 'rider',
    rideId: 'ride-abc',
    category: SupportTicketCategory.RIDE_ISSUE,
    priority: SupportTicketPriority.MEDIUM,
    status: SupportTicketStatus.OPEN,
    subject: 'Driver took wrong route',
    description: 'Driver went in opposite direction adding 15 mins.',
    attachments: null,
    assignedAdminId: null,
    resolutionNotes: null,
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date('2026-10-15T12:00:00Z'),
    updatedAt: new Date('2026-10-15T12:00:00Z'),
  };

  beforeEach(() => {
    supportTicketRepository = {
      create: jest.fn((dto) => ({
        ...dto,
        id: 'ticket-new-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      save: jest.fn(async (entity) => ({ ...entity })),
      findOne: jest.fn().mockResolvedValue(null),
      createQueryBuilder: jest.fn(),
    };

    rideRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    userRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    driverRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    notificationsService = {
      notifyUser: jest.fn().mockResolvedValue(undefined),
      saveInApp: jest.fn().mockResolvedValue(undefined),
    };

    service = new SupportService(
      supportTicketRepository,
      rideRepository,
      userRepository,
      driverRepository,
      notificationsService,
    );
  });

  describe('createTicket', () => {
    it('creates a ticket with default priority and notifies user', async () => {
      const result = await service.createTicket(mockUser, {
        subject: 'General Question',
        description: 'How do I change my default pickup address?',
        category: SupportTicketCategory.GENERAL,
      });

      expect(supportTicketRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          userRole: 'rider',
          category: SupportTicketCategory.GENERAL,
          priority: SupportTicketPriority.MEDIUM,
          status: SupportTicketStatus.OPEN,
          subject: 'General Question',
          rideId: null,
        }),
      );
      expect(supportTicketRepository.save).toHaveBeenCalled();
      expect(notificationsService.notifyUser).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          type: 'support.ticket_created',
        }),
      );
      expect(result.id).toBe('ticket-new-id');
      expect(result.ticketNumber).toMatch(/^TKT-/);
    });

    it('auto-escalates priority to URGENT for safety category when not specified', async () => {
      await service.createTicket(mockUser, {
        subject: 'Safety concern during trip',
        description: 'Driver drove dangerously on highway.',
        category: SupportTicketCategory.SAFETY,
      });

      expect(supportTicketRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: SupportTicketPriority.URGENT,
        }),
      );
    });

    it('preserves explicitly specified priority', async () => {
      await service.createTicket(mockUser, {
        subject: 'App lag issue',
        description: 'Map rendered slowly.',
        category: SupportTicketCategory.GENERAL,
        priority: SupportTicketPriority.LOW,
      });

      expect(supportTicketRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: SupportTicketPriority.LOW,
        }),
      );
    });

    it('validates ride existence and throws NotFoundException when ride does not exist', async () => {
      rideRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createTicket(mockUser, {
          subject: 'Ride issue',
          description: 'Problem with ride',
          category: SupportTicketCategory.RIDE_ISSUE,
          rideId: 'non-existent-ride',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects ticket creation if user was not a participant of the ride', async () => {
      rideRepository.findOne.mockResolvedValue({
        id: 'ride-other',
        riderId: 'different-user',
        driverId: 'different-driver',
      });

      await expect(
        service.createTicket(mockUser, {
          subject: 'Ride issue',
          description: 'Problem with ride',
          category: SupportTicketCategory.RIDE_ISSUE,
          rideId: 'ride-other',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows rider of the ride to raise a ticket', async () => {
      rideRepository.findOne.mockResolvedValue(mockRide);

      const result = await service.createTicket(mockUser, {
        subject: 'Ride issue',
        description: 'Problem with ride',
        category: SupportTicketCategory.RIDE_ISSUE,
        rideId: mockRide.id,
      });

      expect(result.rideId).toBe(mockRide.id);
    });

    it('allows driver of the ride to raise a ticket', async () => {
      rideRepository.findOne.mockResolvedValue(mockRide);
      driverRepository.findOne.mockResolvedValue({
        id: 'driver-rec-456',
        userId: 'driver-user-456',
      });

      const result = await service.createTicket(mockDriverUser, {
        subject: 'Rider was rude',
        description: 'Rider damaged backseat.',
        category: SupportTicketCategory.RIDE_ISSUE,
        rideId: mockRide.id,
      });

      expect(result.userRole).toBe('driver');
      expect(result.rideId).toBe(mockRide.id);
    });

    it('allows admin to raise a ticket on any ride', async () => {
      rideRepository.findOne.mockResolvedValue(mockRide);

      const result = await service.createTicket(mockAdminUser, {
        subject: 'Admin inquiry',
        description: 'Investigating charge discrepancy',
        category: SupportTicketCategory.FARE_DISPUTE,
        rideId: mockRide.id,
      });

      expect(result.userRole).toBe('admin');
      expect(result.rideId).toBe(mockRide.id);
    });
  });

  describe('listUserTickets', () => {
    it('queries tickets belonging to user with pagination and sorting', async () => {
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockTicket], 1]),
      };
      supportTicketRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.listUserTickets('user-123', {
        page: 1,
        limit: 10,
        status: SupportTicketStatus.OPEN,
        category: SupportTicketCategory.RIDE_ISSUE,
      });

      expect(qb.where).toHaveBeenCalledWith('ticket.userId = :userId', {
        userId: 'user-123',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('ticket.status = :status', {
        status: SupportTicketStatus.OPEN,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('ticket.category = :category', {
        category: SupportTicketCategory.RIDE_ISSUE,
      });
      expect(result.total).toBe(1);
      expect(result.tickets).toEqual([mockTicket]);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('getTicketById', () => {
    it('throws NotFoundException if ticket does not exist', async () => {
      supportTicketRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getTicketById('invalid-id', mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if non-admin accesses another user ticket', async () => {
      supportTicketRepository.findOne.mockResolvedValue({
        ...mockTicket,
        userId: 'other-user',
      });

      await expect(
        service.getTicketById('ticket-1', mockUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns ticket if caller is ticket owner', async () => {
      supportTicketRepository.findOne.mockResolvedValue(mockTicket);

      const result = await service.getTicketById('ticket-1', mockUser);
      expect(result).toEqual(mockTicket);
    });

    it('returns ticket if caller is admin even if not owner', async () => {
      supportTicketRepository.findOne.mockResolvedValue(mockTicket);

      const result = await service.getTicketById('ticket-1', mockAdminUser);
      expect(result).toEqual(mockTicket);
    });
  });

  describe('adminUpdateTicket', () => {
    it('throws NotFoundException if ticket does not exist', async () => {
      supportTicketRepository.findOne.mockResolvedValue(null);

      await expect(
        service.adminUpdateTicket('invalid-id', 'admin-999', {
          status: SupportTicketStatus.RESOLVED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates ticket status to RESOLVED, sets resolvedAt, and notifies user', async () => {
      const ticketToUpdate = { ...mockTicket, status: SupportTicketStatus.OPEN };
      supportTicketRepository.findOne.mockResolvedValue(ticketToUpdate);

      const result = await service.adminUpdateTicket('ticket-1', 'admin-999', {
        status: SupportTicketStatus.RESOLVED,
        resolutionNotes: 'Fare adjustment of 50 INR processed.',
      });

      expect(result.status).toBe(SupportTicketStatus.RESOLVED);
      expect(result.resolvedAt).toBeInstanceOf(Date);
      expect(result.resolutionNotes).toBe(
        'Fare adjustment of 50 INR processed.',
      );
      expect(supportTicketRepository.save).toHaveBeenCalled();
      expect(notificationsService.notifyUser).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          type: 'support.status_updated',
          title: expect.stringContaining('TKT-TEST-001'),
        }),
      );
    });

    it('clears resolvedAt if a resolved ticket is reopened', async () => {
      const resolvedTicket = {
        ...mockTicket,
        status: SupportTicketStatus.RESOLVED,
        resolvedAt: new Date('2026-10-15T10:00:00Z'),
      };
      supportTicketRepository.findOne.mockResolvedValue(resolvedTicket);

      const result = await service.adminUpdateTicket('ticket-1', 'admin-999', {
        status: SupportTicketStatus.IN_PROGRESS,
      });

      expect(result.status).toBe(SupportTicketStatus.IN_PROGRESS);
      expect(result.resolvedAt).toBeNull();
    });

    it('updates assignedAdminId after verifying admin user exists', async () => {
      supportTicketRepository.findOne.mockResolvedValue({ ...mockTicket });
      userRepository.findOne.mockResolvedValue({
        id: 'admin-agent-1',
        name: 'Agent Smith',
      });

      const result = await service.adminUpdateTicket('ticket-1', 'admin-999', {
        assignedAdminId: 'admin-agent-1',
      });

      expect(result.assignedAdminId).toBe('admin-agent-1');
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'admin-agent-1' },
      });
    });

    it('throws NotFoundException if assigned admin user does not exist', async () => {
      supportTicketRepository.findOne.mockResolvedValue({ ...mockTicket });
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.adminUpdateTicket('ticket-1', 'admin-999', {
          assignedAdminId: 'non-existent-admin',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('adminListTickets', () => {
    it('returns all tickets with filters and pagination', async () => {
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockTicket], 1]),
      };
      supportTicketRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.adminListTickets({
        page: 1,
        limit: 20,
        priority: SupportTicketPriority.HIGH,
        search: 'wrong route',
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'ticket.priority = :priority',
        { priority: SupportTicketPriority.HIGH },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(ticket.subject ILIKE :term OR ticket.ticketNumber ILIKE :term OR user.name ILIKE :term OR user.phone ILIKE :term)',
        { term: '%wrong route%' },
      );
      expect(result.total).toBe(1);
      expect(result.tickets).toEqual([mockTicket]);
    });
  });

  describe('adminGetTicketById', () => {
    it('returns any ticket for admin', async () => {
      supportTicketRepository.findOne.mockResolvedValue(mockTicket);

      const result = await service.adminGetTicketById('ticket-1');
      expect(result).toEqual(mockTicket);
    });

    it('throws NotFoundException if ticket does not exist', async () => {
      supportTicketRepository.findOne.mockResolvedValue(null);

      await expect(
        service.adminGetTicketById('invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
