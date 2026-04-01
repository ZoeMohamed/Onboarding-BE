import { ApiProperty } from '@nestjs/swagger';
import { OrderResponseDto } from './order-response.dto';

class OrderListMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 1 })
  total: number;

  @ApiProperty({ example: 1 })
  totalPages: number;

  @ApiProperty({ example: false })
  hasNextPage: boolean;

  @ApiProperty({ example: false })
  hasPrevPage: boolean;
}

export class OrderListResponseDto {
  @ApiProperty({ type: [OrderResponseDto] })
  data: OrderResponseDto[];

  @ApiProperty({ type: OrderListMetaDto })
  meta: OrderListMetaDto;
}
