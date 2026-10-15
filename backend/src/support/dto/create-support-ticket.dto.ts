import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  SupportTicketCategory,
  SupportTicketPriority,
} from '../entities/support-ticket.entity';

export class CreateSupportTicketDto {
  @IsString()
  @MinLength(3, { message: 'Subject must be at least 3 characters long' })
  @MaxLength(200, { message: 'Subject cannot exceed 200 characters' })
  subject!: string;

  @IsString()
  @MinLength(5, { message: 'Description must be at least 5 characters long' })
  @MaxLength(2000, { message: 'Description cannot exceed 2000 characters' })
  description!: string;

  @IsEnum(SupportTicketCategory, {
    message: `Category must be one of: ${Object.values(SupportTicketCategory).join(', ')}`,
  })
  category!: SupportTicketCategory;

  @IsOptional()
  @IsUUID('all', { message: 'rideId must be a valid UUID' })
  rideId?: string;

  @IsOptional()
  @IsEnum(SupportTicketPriority, {
    message: `Priority must be one of: ${Object.values(SupportTicketPriority).join(', ')}`,
  })
  priority?: SupportTicketPriority;

  @IsOptional()
  @IsArray({ message: 'attachments must be an array of strings' })
  @IsString({ each: true, message: 'Each attachment must be a string' })
  attachments?: string[];
}
