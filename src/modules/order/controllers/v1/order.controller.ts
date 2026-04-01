import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiPaginationQuery } from '../../../../common/decorators/api-pagination-query.decorator';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { User } from '../../../user/entities/user.entity';
import { OrderApplication } from '../../applications/order.application';
import { CreateOrderDto } from '../../dto/create-order.dto';
import { OrderListResponseDto } from '../../dto/order-list-response.dto';
import { OrderResponseDto } from '../../dto/order-response.dto';
import { ListOrdersQueryDto } from '../../dto/list-orders-query.dto';

@ApiTags('Orders')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER)
@Controller({ path: 'orders', version: '1' })
export class OrderController {
  constructor(private readonly application: OrderApplication) {}

  @ApiOperation({ summary: 'Create order (USER only)' })
  @ApiCreatedResponse({
    description: 'Order berhasil dibuat',
    type: OrderResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden (role bukan USER)' })
  @ApiNotFoundResponse({ description: 'Event tidak ditemukan' })
  @ApiBadRequestResponse({
    description: 'Event belum dipublish / Tiket tidak tersedia',
  })
  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser() currentUser: User) {
    return this.application.create(dto, currentUser);
  }

  @ApiOperation({ summary: 'List order milik user (USER only)' })
  @ApiOkResponse({
    description: 'Daftar order milik user dengan pagination',
    type: OrderListResponseDto,
  })
  @ApiPaginationQuery()
  @Get()
  list(@Query() query: ListOrdersQueryDto, @CurrentUser() currentUser: User) {
    return this.application.list(query, currentUser);
  }

  @ApiOperation({ summary: 'Get detail order milik user (USER only)' })
  @ApiOkResponse({
    description: 'Detail order',
    type: OrderResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Order tidak ditemukan' })
  @ApiForbiddenResponse({ description: 'Bukan pemilik order / role bukan USER' })
  @Get(':id')
  detail(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.application.detail(id, currentUser);
  }
}
