import { Injectable } from '@nestjs/common';
import { User } from '../../user/entities/user.entity';
import { CreateEventDto } from '../dto/create-event.dto';
import { ListEventsQueryDto } from '../dto/list-events-query.dto';
import { UpdateEventDto } from '../dto/update-event.dto';
import { EventService } from '../services/event.service';

@Injectable()
export class EventApplication {
  constructor(private readonly service: EventService) {}

  create(dto: CreateEventDto, currentUser: User) {
    return this.service.create(dto, currentUser);
  }

  list(query: ListEventsQueryDto, currentUser?: User) {
    return this.service.list(query, currentUser);
  }

  detail(id: string) {
    return this.service.detail(id);
  }

  update(id: string, dto: UpdateEventDto) {
    return this.service.update(id, dto);
  }

  remove(id: string) {
    return this.service.remove(id);
  }

  publish(id: string) {
    return this.service.publish(id);
  }

  unpublish(id: string) {
    return this.service.unpublish(id);
  }
}
