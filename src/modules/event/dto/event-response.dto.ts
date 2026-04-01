import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus } from '../../../common/enums/event-status.enum';

export class EventResponseDto {
  @ApiProperty({
    example: '55555555-5555-4555-8555-555555555555',
  })
  id: string;

  @ApiProperty({
    example: 'Java Jazz Seed Concert',
  })
  title: string;

  @ApiPropertyOptional({
    example: 'Event seed untuk simulasi pembelian tiket.',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    example: 'Jakarta Convention Center',
  })
  location: string;

  @ApiProperty({
    example: '2026-06-15T12:00:00.000Z',
  })
  startDate: Date;

  @ApiProperty({
    example: '2026-06-15T15:00:00.000Z',
  })
  endDate: Date;

  @ApiProperty({
    example: 350000,
  })
  price: number;

  @ApiProperty({
    example: 500,
  })
  totalTickets: number;

  @ApiProperty({
    example: 2,
  })
  soldTickets: number;

  @ApiProperty({
    enum: EventStatus,
    example: EventStatus.PUBLISHED,
  })
  status: EventStatus;

  @ApiProperty({
    example: '33333333-3333-4333-8333-333333333333',
  })
  categoryId: string;

  @ApiProperty({
    example: '11111111-1111-4111-8111-111111111111',
  })
  createdById: string;

  @ApiProperty({
    example: '2026-03-31T04:40:14.289Z',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-03-31T04:40:14.289Z',
  })
  updatedAt: Date;
}
