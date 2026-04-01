import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsListCacheInterceptor } from '../../common/interceptors/events-list-cache.interceptor';
import { CacheInvalidationService } from '../../common/services/cache-invalidation.service';
import { EventCategoryModule } from '../event-category/event-category.module';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EventApplication } from './applications/event.application';
import { EventController } from './controllers/v1/event.controller';
import { Event } from './entities/event.entity';
import { EventRepository } from './services/event.repository';
import { EventService } from './services/event.service';

@Module({
  imports: [TypeOrmModule.forFeature([Event]), EventCategoryModule],
  controllers: [EventController],
  providers: [
    EventApplication,
    EventService,
    EventRepository,
    RolesGuard,
    EventsListCacheInterceptor,
    CacheInvalidationService,
  ],
})
export class EventModule {}
