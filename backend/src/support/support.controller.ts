import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-users.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { ListSupportTicketsQueryDto } from './dto/list-support-tickets.dto';
import { SupportService } from './support.service';
import type { CurrentUserPayload } from './support.service';

const supportQueryValidation = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

@Controller('support/tickets')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createTicket(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateSupportTicketDto,
  ) {
    return this.supportService.createTicket(user, dto);
  }

  @Get()
  listTickets(
    @CurrentUser() user: CurrentUserPayload,
    @Query(supportQueryValidation) query: ListSupportTicketsQueryDto,
  ) {
    return this.supportService.listUserTickets(user.userId, query);
  }

  @Get(':id')
  getTicket(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.supportService.getTicketById(id, user);
  }
}
