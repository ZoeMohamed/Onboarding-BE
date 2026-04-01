import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../../../common/enums/order-status.enum';
import { TicketResponseDto } from './ticket-response.dto';

export class OrderResponseDto {
  @ApiProperty({
    example: '77777777-7777-4777-8777-777777777777',
  })
  id: string;

  @ApiProperty({
    example: '22222222-2222-4222-8222-222222222222',
  })
  userId: string;

  @ApiProperty({
    example: '55555555-5555-4555-8555-555555555555',
  })
  eventId: string;

  @ApiProperty({
    example: 2,
  })
  quantity: number;

  @ApiProperty({
    example: 700000,
  })
  totalPrice: number;

  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @ApiPropertyOptional({
    example: 'seed-invoice-0001',
    nullable: true,
  })
  xenditInvoiceId: string | null;

  @ApiPropertyOptional({
    example: 'https://checkout.xendit.co/web/seed-invoice-0001',
    nullable: true,
  })
  paymentUrl: string | null;

  @ApiProperty({
    example: '2026-04-01T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-04-01T12:00:00.000Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    type: [TicketResponseDto],
  })
  tickets?: TicketResponseDto[];
}
