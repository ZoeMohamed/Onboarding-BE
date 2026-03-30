import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EventCategoryApplication } from './applications/event-category.application';
import { EventCategoryController } from './controllers/v1/event-category.controller';
import { EventCategory } from './entities/event-category.entity';
import { EventCategoryRepository } from './services/event-category.repository';
import { EventCategoryService } from './services/event-category.service';

@Module({
  imports: [TypeOrmModule.forFeature([EventCategory]), AuthModule],
  controllers: [EventCategoryController],
  providers: [
    EventCategoryApplication,
    EventCategoryService,
    EventCategoryRepository,
    RolesGuard,
  ],
})
export class EventCategoryModule {}
