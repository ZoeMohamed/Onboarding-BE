import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EventCategoryResponseDto {
  @ApiProperty({
    example: '33333333-3333-4333-8333-333333333333',
  })
  id: string;

  @ApiProperty({
    example: 'Music',
  })
  name: string;

  @ApiPropertyOptional({
    example: 'Music events',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    example: '2026-03-30T08:45:00.000Z',
  })
  createdAt: Date;
}
