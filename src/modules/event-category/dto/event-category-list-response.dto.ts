import { ApiProperty } from '@nestjs/swagger';
import { EventCategoryResponseDto } from './event-category-response.dto';

export class EventCategoryPaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 25 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNextPage: boolean;

  @ApiProperty({ example: false })
  hasPrevPage: boolean;
}

export class EventCategoryListResponseDto {
  @ApiProperty({
    type: EventCategoryResponseDto,
    isArray: true,
  })
  data: EventCategoryResponseDto[];

  @ApiProperty({
    type: EventCategoryPaginationMetaDto,
  })
  meta: EventCategoryPaginationMetaDto;
}
