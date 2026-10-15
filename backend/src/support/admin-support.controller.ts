import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-users.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/role.guard';
import { AdminListSupportTicketsQueryDto } from './dto/list-support-tickets.dto';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';
import { SupportService } from './support.service';
import type { CurrentUserPayload } from './support.service';

const adminSupportQueryValidation = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

@Controller('admin/support/tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminSupportController {
  constructor(private readonly supportService: SupportService) {}

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSupportTicketDto,
  ) {
    return this.supportService.adminUpdateTicket(id, user.userId, dto);
  }

  @Get()
  listTickets(
    @Query(adminSupportQueryValidation) query: AdminListSupportTicketsQueryDto,
  ) {
    return this.supportService.adminListTickets(query);
  }

  @Get(':id')
  getTicket(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.supportService.adminGetTicketById(id);
  }
}
