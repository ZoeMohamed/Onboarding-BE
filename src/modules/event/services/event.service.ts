import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_KEY_PREFIX } from '../../../common/constants/cache.constant';
import { EventStatus } from '../../../common/enums/event-status.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { CacheInvalidationService } from '../../../common/services/cache-invalidation.service';
import { User } from '../../user/entities/user.entity';
import { EventCategoryRepository } from '../../event-category/services/event-category.repository';
import { CreateEventDto } from '../dto/create-event.dto';
import { ListEventsQueryDto } from '../dto/list-events-query.dto';
import { UpdateEventDto } from '../dto/update-event.dto';
import { Event } from '../entities/event.entity';
import { EventRepository } from './event.repository';

type ListResult = {
  data: Event[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    private readonly eventRepository: EventRepository,
    private readonly eventCategoryRepository: EventCategoryRepository,
    private readonly cacheInvalidationService: CacheInvalidationService,
  ) {}

  async create(dto: CreateEventDto, currentUser: User): Promise<Event> {
    await this.ensureCategoryExists(dto.categoryId);

    const created = await this.eventRepository.create({
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      location: dto.location.trim(),
      startDate: dto.startDate,
      endDate: dto.endDate,
      price: dto.price,
      totalTickets: dto.totalTickets,
      soldTickets: 0,
      status: EventStatus.DRAFT,
      categoryId: dto.categoryId,
      createdById: currentUser.id,
    });

    await this.invalidateEventListCache();
    return created;
  }

  async list(query: ListEventsQueryDto, currentUser?: User): Promise<ListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const isAdmin = currentUser?.role === UserRole.ADMIN;

    const { data, total } = await this.eventRepository.list(page, limit, {
      search: query.search,
      categoryId: query.categoryId,
      status: isAdmin ? undefined : EventStatus.PUBLISHED,
    });

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async detail(id: string): Promise<Event> {
    const event = await this.eventRepository.findById(id);

    if (!event) {
      throw new NotFoundException('Event tidak ditemukan');
    }

    return event;
  }

  async update(id: string, dto: UpdateEventDto): Promise<Event> {
    const event = await this.detail(id);

    if (dto.categoryId !== undefined) {
      await this.ensureCategoryExists(dto.categoryId);
      event.categoryId = dto.categoryId;
    }

    if (dto.title !== undefined) {
      event.title = dto.title.trim();
    }

    if (dto.description !== undefined) {
      event.description = dto.description === null ? null : dto.description.trim();
    }

    if (dto.location !== undefined) {
      event.location = dto.location.trim();
    }

    if (dto.price !== undefined) {
      event.price = dto.price;
    }

    if (dto.totalTickets !== undefined) {
      event.totalTickets = dto.totalTickets;
    }

    if (dto.startDate !== undefined) {
      event.startDate = dto.startDate;
    }

    if (dto.endDate !== undefined) {
      event.endDate = dto.endDate;
    }

    if (event.endDate <= event.startDate) {
      throw new BadRequestException('endDate harus setelah startDate');
    }

    const updated = await this.eventRepository.save(event);
    await this.invalidateEventListCache();
    return updated;
  }

  async remove(id: string): Promise<void> {
    const event = await this.detail(id);

    if (event.status === EventStatus.PUBLISHED) {
      throw new BadRequestException('Tidak bisa delete event yang sudah dipublish');
    }

    const deleted = await this.eventRepository.deleteById(id);

    if (!deleted) {
      throw new NotFoundException('Event tidak ditemukan');
    }

    await this.invalidateEventListCache();
  }

  async publish(id: string): Promise<Event> {
    const event = await this.detail(id);

    if (event.status === EventStatus.PUBLISHED) {
      throw new BadRequestException('Event sudah dipublish');
    }

    if (event.status !== EventStatus.DRAFT) {
      throw new BadRequestException('Event hanya bisa dipublish dari status DRAFT');
    }

    event.status = EventStatus.PUBLISHED;
    const published = await this.eventRepository.save(event);
    await this.invalidateEventListCache();
    return published;
  }

  async unpublish(id: string): Promise<Event> {
    const event = await this.detail(id);

    if (event.status === EventStatus.DRAFT) {
      throw new BadRequestException('Event sudah dalam status DRAFT');
    }

    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException(
        'Event hanya bisa di-unpublish dari status PUBLISHED',
      );
    }

    event.status = EventStatus.DRAFT;
    const unpublished = await this.eventRepository.save(event);
    await this.invalidateEventListCache();
    return unpublished;
  }

  private async ensureCategoryExists(categoryId: string): Promise<void> {
    const category = await this.eventCategoryRepository.findById(categoryId);

    if (!category) {
      throw new NotFoundException('Kategori tidak ditemukan');
    }
  }

  private async invalidateEventListCache(): Promise<void> {
    try {
      await this.cacheInvalidationService.invalidateByPrefixes([
        CACHE_KEY_PREFIX.eventsList,
      ]);
    } catch (error) {
      this.logger.warn(
        `Gagal invalidate cache event: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
}
