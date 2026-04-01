import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventStatus } from '../../../common/enums/event-status.enum';
import { Event } from '../entities/event.entity';

type ListFilters = {
  search?: string;
  categoryId?: string;
  status?: EventStatus;
};

@Injectable()
export class EventRepository {
  constructor(
    @InjectRepository(Event)
    private readonly repository: Repository<Event>,
  ) {}

  findById(id: string): Promise<Event | null> {
    return this.repository
      .createQueryBuilder('event')
      .where('event.id = :id', { id })
      .getOne();
  }

  async list(
    page: number,
    limit: number,
    filters: ListFilters,
  ): Promise<{ data: Event[]; total: number }> {
    const query = this.repository.createQueryBuilder('event');

    if (filters.status) {
      query.where('event.status = :status', { status: filters.status });
    }

    if (filters.search) {
      query.andWhere('LOWER(event.title) LIKE LOWER(:search)', {
        search: `%${filters.search}%`,
      });
    }

    if (filters.categoryId) {
      query.andWhere('event."categoryId" = :categoryId', {
        categoryId: filters.categoryId,
      });
    }

    const [data, total] = await query
      .orderBy('event."createdAt"', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async create(data: Partial<Event>): Promise<Event> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  save(entity: Event): Promise<Event> {
    return this.repository.save(entity);
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.repository.delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
