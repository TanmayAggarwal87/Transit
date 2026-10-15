import {
  
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SupportTicket,
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
} from './entities/support-ticket.entity';
import { Ride } from '../rides/entities/ride.entity';
import { User } from '../users/entities/user.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import {
  AdminListSupportTicketsQueryDto,
  ListSupportTicketsQueryDto,
} from './dto/list-support-tickets.dto';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';

export interface CurrentUserPayload {
  userId: string;
  roles?: string[] | string;
  driverId?: string | null;
}

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    @InjectRepository(SupportTicket)
    private readonly supportTicketRepository: Repository<SupportTicket>,
    @InjectRepository(Ride)
    private readonly rideRepository: Repository<Ride>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Helper to parse roles safely.
   */
  private parseRoles(user?: CurrentUserPayload): string[] {
    if (!user || !user.roles) return ['rider'];
    if (Array.isArray(user.roles)) return user.roles;
    if (typeof user.roles === 'string') {
      try {
        const parsed = JSON.parse(user.roles);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return [user.roles];
      }
    }
    return ['rider'];
  }

  /**
   * Generates a unique, readable ticket number.
   */
  private generateTicketNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TKT-${timestamp}-${random}`;
  }

  /**
   * Create a new support ticket.
   */
  async createTicket(
    user: CurrentUserPayload,
    dto: CreateSupportTicketDto,
  ): Promise<SupportTicket> {
    const roles = this.parseRoles(user);
    const isAdmin = roles.includes('admin');
    const isDriver = roles.includes('driver');
    const userRole: 'rider' | 'driver' | 'admin' = isAdmin
      ? 'admin'
      : isDriver
        ? 'driver'
        : 'rider';

    // If rideId is provided, validate ride existence and user's participation
    if (dto.rideId) {
      const ride = await this.rideRepository.findOne({
        where: { id: dto.rideId },
      });
      if (!ride) {
        throw new NotFoundException(`Ride with ID ${dto.rideId} not found`);
      }

      if (!isAdmin) {
        let isParticipant = ride.riderId === user.userId;
        if (!isParticipant && isDriver) {
          const driver = await this.driverRepository.findOne({
            where: { userId: user.userId },
          });
          if (driver && ride.driverId === driver.id) {
            isParticipant = true;
          }
        }

        if (!isParticipant) {
          throw new ForbiddenException(
            'You can only raise support tickets for rides you were part of',
          );
        }
      }
    }

    // Auto-select priority if not explicitly specified
    let priority = dto.priority;
    if (!priority) {
      if (dto.category === SupportTicketCategory.SAFETY) {
        priority = SupportTicketPriority.URGENT;
      } else {
        priority = SupportTicketPriority.MEDIUM;
      }
    }

    const ticketNumber = this.generateTicketNumber();

    const ticket = this.supportTicketRepository.create({
      ticketNumber,
      userId: user.userId,
      userRole,
      rideId: dto.rideId ?? null,
      category: dto.category,
      priority,
      status: SupportTicketStatus.OPEN,
      subject: dto.subject.trim(),
      description: dto.description.trim(),
      attachments: dto.attachments && dto.attachments.length > 0 ? dto.attachments : null,
      assignedAdminId: null,
      resolutionNotes: null,
      resolvedAt: null,
      closedAt: null,
    });

    const savedTicket = await this.supportTicketRepository.save(ticket);

    // Asynchronously notify user of ticket creation
    try {
      await this.notificationsService.notifyUser(user.userId, {
        type: 'support.ticket_created',
        title: `Support Ticket Created: #${savedTicket.ticketNumber}`,
        body: `Your ticket regarding "${savedTicket.subject}" has been received. Ticket ID: ${savedTicket.ticketNumber}.`,
        deepLink: `/support/tickets/${savedTicket.id}`,
        data: { ticketId: savedTicket.id, ticketNumber: savedTicket.ticketNumber },
      });
    } catch (err) {
      this.logger.warn(`Failed to send notification for ticket ${savedTicket.ticketNumber}: ${err}`);
    }

    return savedTicket;
  }

  /**
   * List tickets raised by the current user.
   */
  async listUserTickets(
    userId: string,
    query: ListSupportTicketsQueryDto,
  ): Promise<{
    tickets: SupportTicket[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.supportTicketRepository
      .createQueryBuilder('ticket')
      .where('ticket.userId = :userId', { userId })
      .leftJoinAndSelect('ticket.ride', 'ride')
      .orderBy('ticket.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.status) {
      qb.andWhere('ticket.status = :status', { status: query.status });
    }

    if (query.category) {
      qb.andWhere('ticket.category = :category', { category: query.category });
    }

    if (query.priority) {
      qb.andWhere('ticket.priority = :priority', { priority: query.priority });
    }

    if (query.rideId) {
      qb.andWhere('ticket.rideId = :rideId', { rideId: query.rideId });
    }

    if (query.search && query.search.trim().length > 0) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere(
        '(ticket.subject ILIKE :term OR ticket.ticketNumber ILIKE :term)',
        { term },
      );
    }

    const [tickets, total] = await qb.getManyAndCount();

    return {
      tickets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single ticket by ID. Only ticket owner or admin can view.
   */
  async getTicketById(
    ticketId: string,
    user: CurrentUserPayload,
  ): Promise<SupportTicket> {
    const ticket = await this.supportTicketRepository.findOne({
      where: { id: ticketId },
      relations: ['user', 'ride', 'assignedAdmin'],
    });

    if (!ticket) {
      throw new NotFoundException(`Support ticket with ID ${ticketId} not found`);
    }

    const roles = this.parseRoles(user);
    const isAdmin = roles.includes('admin');

    if (!isAdmin && ticket.userId !== user.userId) {
      throw new ForbiddenException('You do not have access to this support ticket');
    }

    return ticket;
  }

  /**
   * Admin: update ticket status, priority, resolution notes, or assigned admin.
   */
  async adminUpdateTicket(
    ticketId: string,
    adminUserId: string,
    dto: UpdateSupportTicketDto,
  ): Promise<SupportTicket> {
    const ticket = await this.supportTicketRepository.findOne({
      where: { id: ticketId },
      relations: ['user', 'ride', 'assignedAdmin'],
    });

    if (!ticket) {
      throw new NotFoundException(`Support ticket with ID ${ticketId} not found`);
    }

    if (dto.assignedAdminId) {
      const adminUser = await this.userRepository.findOne({
        where: { id: dto.assignedAdminId },
      });
      if (!adminUser) {
        throw new NotFoundException(
          `Assigned admin user with ID ${dto.assignedAdminId} not found`,
        );
      }
      ticket.assignedAdminId = dto.assignedAdminId;
      ticket.assignedAdmin = adminUser;
    }

    if (dto.priority) {
      ticket.priority = dto.priority;
    }

    if (dto.resolutionNotes !== undefined) {
      ticket.resolutionNotes = dto.resolutionNotes ? dto.resolutionNotes.trim() : null;
    }

    if (dto.status && dto.status !== ticket.status) {
      const previousStatus = ticket.status;
      ticket.status = dto.status;

      if (dto.status === SupportTicketStatus.RESOLVED && !ticket.resolvedAt) {
        ticket.resolvedAt = new Date();
      }
      if (dto.status === SupportTicketStatus.CLOSED && !ticket.closedAt) {
        ticket.closedAt = new Date();
      }

      // If reopening a closed/resolved ticket
      if (
        (dto.status === SupportTicketStatus.OPEN ||
          dto.status === SupportTicketStatus.IN_PROGRESS) &&
        previousStatus === SupportTicketStatus.RESOLVED
      ) {
        ticket.resolvedAt = null;
      }
      if (
        (dto.status === SupportTicketStatus.OPEN ||
          dto.status === SupportTicketStatus.IN_PROGRESS) &&
        previousStatus === SupportTicketStatus.CLOSED
      ) {
        ticket.closedAt = null;
      }
    }

    const updated = await this.supportTicketRepository.save(ticket);

    // Notify ticket owner about status or note updates
    try {
      await this.notificationsService.notifyUser(updated.userId, {
        type: 'support.status_updated',
        title: `Support Ticket #${updated.ticketNumber} Updated`,
        body: `Your ticket status is now "${updated.status}".${
          updated.resolutionNotes ? ` Resolution note: ${updated.resolutionNotes}` : ''
        }`,
        deepLink: `/support/tickets/${updated.id}`,
        data: { ticketId: updated.id, status: updated.status },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to notify user ${updated.userId} of ticket update: ${err}`,
      );
    }

    return updated;
  }

  /**
   * Admin: list all support tickets across the platform.
   */
  async adminListTickets(
    query: AdminListSupportTicketsQueryDto,
  ): Promise<{
    tickets: SupportTicket[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.supportTicketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.user', 'user')
      .leftJoinAndSelect('ticket.ride', 'ride')
      .leftJoinAndSelect('ticket.assignedAdmin', 'assignedAdmin')
      .orderBy('ticket.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.userId) {
      qb.andWhere('ticket.userId = :userId', { userId: query.userId });
    }

    if (query.assignedAdminId) {
      qb.andWhere('ticket.assignedAdminId = :assignedAdminId', {
        assignedAdminId: query.assignedAdminId,
      });
    }

    if (query.status) {
      qb.andWhere('ticket.status = :status', { status: query.status });
    }

    if (query.category) {
      qb.andWhere('ticket.category = :category', { category: query.category });
    }

    if (query.priority) {
      qb.andWhere('ticket.priority = :priority', { priority: query.priority });
    }

    if (query.rideId) {
      qb.andWhere('ticket.rideId = :rideId', { rideId: query.rideId });
    }

    if (query.search && query.search.trim().length > 0) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere(
        '(ticket.subject ILIKE :term OR ticket.ticketNumber ILIKE :term OR user.name ILIKE :term OR user.phone ILIKE :term)',
        { term },
      );
    }

    const [tickets, total] = await qb.getManyAndCount();

    return {
      tickets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Admin: get any ticket details.
   */
  async adminGetTicketById(ticketId: string): Promise<SupportTicket> {
    const ticket = await this.supportTicketRepository.findOne({
      where: { id: ticketId },
      relations: ['user', 'ride', 'assignedAdmin'],
    });

    if (!ticket) {
      throw new NotFoundException(`Support ticket with ID ${ticketId} not found`);
    }

    return ticket;
  }
}
