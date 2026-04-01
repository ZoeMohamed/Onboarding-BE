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
  ApiBadRequestResponse,
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
import { EventsListCacheInterceptor } from '../../../../common/interceptors/events-list-cache.interceptor';
import { config } from '../../../../infrastructure/config';
import { User } from '../../../user/entities/user.entity';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { EventApplication } from '../../applications/event.application';
import { CreateEventDto } from '../../dto/create-event.dto';
import { EventListResponseDto } from '../../dto/event-list-response.dto';
import { EventResponseDto } from '../../dto/event-response.dto';
import { ListEventsQueryDto } from '../../dto/list-events-query.dto';
import { UpdateEventDto } from '../../dto/update-event.dto';

@ApiTags('Events')
@Controller({ path: 'events', version: '1' })
export class EventController {
  constructor(private readonly application: EventApplication) {}

  @ApiOperation({
    summary: 'List events (public: only PUBLISHED, ADMIN: all status)',
  })
  @ApiOkResponse({
    description: 'Daftar event dengan pagination',
    type: EventListResponseDto,
  })
  @ApiPaginationQuery({
    includeSearch: true,
    searchDescription: 'Search by title',
    searchExample: 'music',
    extras: [
      {
        name: 'categoryId',
        description: 'Filter by categoryId',
        example: '33333333-3333-4333-8333-333333333333',
      },
    ],
  })
  @UseInterceptors(EventsListCacheInterceptor)
  @CacheTTL(config.redis.ttl * CACHE_TTL_MS_MULTIPLIER)
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  list(
    @Query() query: ListEventsQueryDto,
    @CurrentUser() currentUser?: User,
  ) {
    return this.application.list(query, currentUser);
  }

  @ApiOperation({ summary: 'Get event detail by id (public)' })
  @ApiOkResponse({
    description: 'Detail event',
    type: EventResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Event tidak ditemukan' })
  @Get(':id')
  detail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.application.detail(id);
  }

  @ApiOperation({ summary: 'Create event (ADMIN only)' })
  @ApiBearerAuth('bearer')
  @ApiCreatedResponse({
    description: 'Event berhasil dibuat',
    type: EventResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden (role bukan ADMIN)' })
  @ApiNotFoundResponse({ description: 'Kategori tidak ditemukan' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateEventDto, @CurrentUser() currentUser: User) {
    return this.application.create(dto, currentUser);
  }

  @ApiOperation({ summary: 'Update event (ADMIN only)' })
  @ApiBearerAuth('bearer')
  @ApiOkResponse({
    description: 'Event berhasil diupdate',
    type: EventResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden (role bukan ADMIN)' })
  @ApiNotFoundResponse({ description: 'Event tidak ditemukan / Kategori tidak ditemukan' })
  @ApiBadRequestResponse({ description: 'Payload tidak valid' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.application.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete event (ADMIN only)' })
  @ApiBearerAuth('bearer')
  @ApiNoContentResponse({ description: 'Event berhasil dihapus' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden (role bukan ADMIN)' })
  @ApiNotFoundResponse({ description: 'Event tidak ditemukan' })
  @ApiBadRequestResponse({
    description: 'Tidak bisa delete event yang sudah dipublish',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.application.remove(id);
  }

  @ApiOperation({ summary: 'Publish event (ADMIN only, DRAFT -> PUBLISHED)' })
  @ApiBearerAuth('bearer')
  @ApiOkResponse({
    description: 'Event berhasil dipublish',
    type: EventResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden (role bukan ADMIN)' })
  @ApiNotFoundResponse({ description: 'Event tidak ditemukan' })
  @ApiBadRequestResponse({ description: 'Event sudah dipublish' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/publish')
  publish(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.application.publish(id);
  }

  @ApiOperation({ summary: 'Unpublish event (ADMIN only, PUBLISHED -> DRAFT)' })
  @ApiBearerAuth('bearer')
  @ApiOkResponse({
    description: 'Event berhasil di-unpublish',
    type: EventResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden (role bukan ADMIN)' })
  @ApiNotFoundResponse({ description: 'Event tidak ditemukan' })
  @ApiBadRequestResponse({
    description: 'Event sudah dalam status DRAFT',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/unpublish')
  unpublish(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.application.unpublish(id);
  }
}
