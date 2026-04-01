import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_KEY_PREFIX } from '../../../common/constants/cache.constant';
import { CacheInvalidationService } from '../../../common/services/cache-invalidation.service';
import { QueryFailedError } from 'typeorm';
import { CreateEventCategoryDto } from '../dto/create-event-category.dto';
import { ListEventCategoriesQueryDto } from '../dto/list-event-categories-query.dto';
import { UpdateEventCategoryDto } from '../dto/update-event-category.dto';
import { EventCategory } from '../entities/event-category.entity';
import { EventCategoryRepository } from './event-category.repository';

type ListResult = {
  data: EventCategory[];
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
export class EventCategoryService {
  private readonly logger = new Logger(EventCategoryService.name);

  constructor(
    private readonly repository: EventCategoryRepository,
    private readonly cacheInvalidationService: CacheInvalidationService,
  ) {}

  async create(dto: CreateEventCategoryDto): Promise<EventCategory> {
    const name = dto.name.trim();
    const existing = await this.repository.findByNameCaseInsensitive(name);

    if (existing) {
      throw new ConflictException('Nama kategori sudah digunakan');
    }

    try {
      const created = await this.repository.create({
        name,
        description: dto.description?.trim() || null,
      });

      await this.invalidateEventCategoryListCache();
      return created;
    } catch (error) {
      if (this.getDbErrorCode(error) === '23505') {
        throw new ConflictException('Nama kategori sudah digunakan');
      }
      throw error;
    }
  }

  async list(query: ListEventCategoriesQueryDto): Promise<ListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search;
    const { data, total } = await this.repository.list(page, limit, search);
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

  async detail(id: string): Promise<EventCategory> {
    const category = await this.repository.findById(id);

    if (!category) {
      throw new NotFoundException('Kategori event tidak ditemukan');
    }

    return category;
  }

  async update(id: string, dto: UpdateEventCategoryDto): Promise<EventCategory> {
    const category = await this.detail(id);

    if (dto.name !== undefined) {
      const nextName = dto.name.trim();
      const duplicate = await this.repository.findByNameCaseInsensitive(nextName);

      if (duplicate && duplicate.id !== category.id) {
        throw new ConflictException('Nama kategori sudah digunakan');
      }

      category.name = nextName;
    }

    if (dto.description !== undefined) {
      category.description =
        dto.description === null ? null : dto.description.trim();
    }

    try {
      const updated = await this.repository.save(category);
      await this.invalidateEventCategoryListCache();
      return updated;
    } catch (error) {
      if (this.getDbErrorCode(error) === '23505') {
        throw new ConflictException('Nama kategori sudah digunakan');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    await this.detail(id);

    try {
      const deleted = await this.repository.deleteById(id);

      if (!deleted) {
        throw new NotFoundException('Kategori event tidak ditemukan');
      }

      await this.invalidateEventCategoryListCache();
    } catch (error) {
      if (this.getDbErrorCode(error) === '23503') {
        throw new ConflictException(
          'Kategori tidak dapat dihapus karena masih dipakai event',
        );
      }
      throw error;
    }
  }

  private getDbErrorCode(error: unknown): string | undefined {
    if (!(error instanceof QueryFailedError)) {
      return undefined;
    }

    return (
      error as QueryFailedError & { driverError?: { code?: string } }
    ).driverError?.code;
  }

  private async invalidateEventCategoryListCache(): Promise<void> {
    try {
      await this.cacheInvalidationService.invalidateByPrefixes([
        CACHE_KEY_PREFIX.eventCategoriesList,
      ]);
    } catch (error) {
      this.logger.warn(
        `Gagal invalidate cache kategori: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
}
