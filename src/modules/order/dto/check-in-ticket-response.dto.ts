import { ApiProperty } from '@nestjs/swagger';

export class CheckInTicketResponseDto {
  @ApiProperty({
    example: 'Check-in berhasil',
  })
  message: string;

  @ApiProperty({
    example: '77777777-7777-4777-8777-777777777777',
  })
  orderId: string;

  @ApiProperty({
    example: '88888888-8888-4888-8888-888888888881',
  })
  ticketId: string;

  @ApiProperty({
    example: 'TKT-H42K7P9Q1X3M',
  })
  ticketCode: string;

  @ApiProperty({
    example: true,
  })
  isUsed: boolean;
}
