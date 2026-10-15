import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  SupportTicketPriority,
  SupportTicketStatus,
} from '../entities/support-ticket.entity';

export class UpdateSupportTicketDto {
  @IsOptional()
  @IsEnum(SupportTicketStatus, {
    message: `Status must be one of: ${Object.values(SupportTicketStatus).join(', ')}`,
  })
  status?: SupportTicketStatus;

  @IsOptional()
  @IsEnum(SupportTicketPriority, {
    message: `Priority must be one of: ${Object.values(SupportTicketPriority).join(', ')}`,
  })
  priority?: SupportTicketPriority;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Resolution notes cannot exceed 2000 characters' })
  resolutionNotes?: string;

  @IsOptional()
  @IsUUID('all', { message: 'assignedAdminId must be a valid UUID' })
  assignedAdminId?: string;
}
