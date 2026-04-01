import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CacheTTL } from '@nestjs/cache-manager';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiPaginationQuery } from '../../../../common/decorators/api-pagination-query.decorator';
import { CACHE_TTL_MS_MULTIPLIER } from '../../../../common/constants/cache.constant';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { EventCategoriesListCacheInterceptor } from '../../../../common/interceptors/event-categories-list-cache.interceptor';
import { config } from '../../../../infrastructure/config';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { EventCategoryApplication } from '../../applications/event-category.application';
import { CreateEventCategoryDto } from '../../dto/create-event-category.dto';
import { EventCategoryListResponseDto } from '../../dto/event-category-list-response.dto';
import { EventCategoryResponseDto } from '../../dto/event-category-response.dto';
import { ListEventCategoriesQueryDto } from '../../dto/list-event-categories-query.dto';
import { UpdateEventCategoryDto } from '../../dto/update-event-category.dto';

@ApiTags('Event Categories')
@Controller({ path: 'event-categories', version: '1' })
export class EventCategoryController {
  constructor(private readonly application: EventCategoryApplication) {}

  @ApiOperation({ summary: 'Create event category (ADMIN only)' })
  @ApiBearerAuth('bearer')
  @ApiCreatedResponse({
    description: 'Kategori berhasil dibuat',
    type: EventCategoryResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden (role bukan ADMIN)' })
  @ApiConflictResponse({ description: 'Nama kategori sudah digunakan' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateEventCategoryDto) {
    return this.application.create(dto);
  }

  @ApiOperation({ summary: 'List event categories (public)' })
  @ApiOkResponse({
    description: 'Daftar kategori dengan pagination',
    type: EventCategoryListResponseDto,
  })
  @ApiPaginationQuery({
    includeSearch: true,
    searchDescription: 'Cari berdasarkan nama/deskripsi',
    searchExample: 'music',
  })
  @UseInterceptors(EventCategoriesListCacheInterceptor)
  @CacheTTL(config.redis.ttl * CACHE_TTL_MS_MULTIPLIER)
  @Get()
  list(@Query() query: ListEventCategoriesQueryDto) {
    return this.application.list(query);
  }

  @ApiOperation({ summary: 'Get event category detail by id (public)' })
  @ApiOkResponse({
    description: 'Detail kategori',
    type: EventCategoryResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Kategori tidak ditemukan' })
  @Get(':id')
  detail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.application.detail(id);
  }

  @ApiOperation({ summary: 'Update event category (ADMIN only)' })
  @ApiBearerAuth('bearer')
  @ApiOkResponse({
    description: 'Kategori berhasil diupdate',
    type: EventCategoryResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden (role bukan ADMIN)' })
  @ApiNotFoundResponse({ description: 'Kategori tidak ditemukan' })
  @ApiConflictResponse({ description: 'Nama kategori sudah digunakan' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateEventCategoryDto,
  ) {
    return this.application.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete event category (ADMIN only)' })
  @ApiBearerAuth('bearer')
  @ApiNoContentResponse({ description: 'Kategori berhasil dihapus' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden (role bukan ADMIN)' })
  @ApiNotFoundResponse({ description: 'Kategori tidak ditemukan' })
  @ApiConflictResponse({
    description: 'Kategori tidak dapat dihapus karena masih dipakai event',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.application.remove(id);
  }
}
