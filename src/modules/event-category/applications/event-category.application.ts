import { Injectable } from '@nestjs/common';
import { CreateEventCategoryDto } from '../dto/create-event-category.dto';
import { ListEventCategoriesQueryDto } from '../dto/list-event-categories-query.dto';
import { UpdateEventCategoryDto } from '../dto/update-event-category.dto';
import { EventCategoryService } from '../services/event-category.service';

@Injectable()
export class EventCategoryApplication {
  constructor(private readonly service: EventCategoryService) {}

  create(dto: CreateEventCategoryDto) {
    return this.service.create(dto);
  }

  list(query: ListEventCategoriesQueryDto) {
    return this.service.list(query);
  }

  detail(id: string) {
    return this.service.detail(id);
  }

  update(id: string, dto: UpdateEventCategoryDto) {
    return this.service.update(id, dto);
  }

  remove(id: string) {
    return this.service.remove(id);
  }
}
