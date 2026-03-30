import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventCategory } from '../entities/event-category.entity';

@Injectable()
export class EventCategoryRepository {
  constructor(
    @InjectRepository(EventCategory)
    private readonly repository: Repository<EventCategory>,
  ) {}

  findById(id: string): Promise<EventCategory | null> {
    return this.repository
      .createQueryBuilder('category')
      .where('category.id = :id', { id })
      .getOne();
  }

  findByNameCaseInsensitive(name: string): Promise<EventCategory | null> {
    return this.repository
      .createQueryBuilder('category')
      .where('LOWER(category.name) = LOWER(:name)', { name })
      .getOne();
  }

  async list(
    page: number,
    limit: number,
    search?: string,
  ): Promise<{ data: EventCategory[]; total: number }> {
    const query = this.repository.createQueryBuilder('category');

    if (search) {
      query.where(
        `
          (
            LOWER(category.name) LIKE LOWER(:search)
            OR LOWER(COALESCE(category.description, '')) LIKE LOWER(:search)
          )
        `,
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query
      .orderBy('category."createdAt"', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async create(data: Partial<EventCategory>): Promise<EventCategory> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  save(entity: EventCategory): Promise<EventCategory> {
    return this.repository.save(entity);
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.repository.delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
