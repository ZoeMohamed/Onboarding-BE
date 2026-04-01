import { ApiProperty } from '@nestjs/swagger';
import { EventResponseDto } from './event-response.dto';

export class EventPaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 2 })
  total: number;

  @ApiProperty({ example: 1 })
  totalPages: number;

  @ApiProperty({ example: false })
  hasNextPage: boolean;

  @ApiProperty({ example: false })
  hasPrevPage: boolean;
}

export class EventListResponseDto {
  @ApiProperty({
    type: EventResponseDto,
    isArray: true,
  })
  data: EventResponseDto[];

  @ApiProperty({
    type: EventPaginationMetaDto,
  })
  meta: EventPaginationMetaDto;
}
