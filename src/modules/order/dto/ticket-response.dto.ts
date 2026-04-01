import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TicketResponseDto {
  @ApiProperty({
    example: '88888888-8888-4888-8888-888888888881',
  })
  id: string;

  @ApiProperty({
    example: 'TKT-H42K7P9Q1X3M',
  })
  ticketCode: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/qr/TKT-H42K7P9Q1X3M.png',
    nullable: true,
  })
  qrCodeUrl: string | null;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/pdf/TKT-H42K7P9Q1X3M.pdf',
    nullable: true,
  })
  pdfUrl: string | null;

  @ApiProperty({
    example: false,
  })
  isUsed: boolean;

  @ApiProperty({
    example: '2026-04-01T12:00:00.000Z',
  })
  createdAt: Date;
}
