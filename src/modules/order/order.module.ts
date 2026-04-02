import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../event/entities/event.entity';
import { QueueModule } from '../queue/queue.module';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OrderApplication } from './applications/order.application';
import { OrderController } from './controllers/v1/order.controller';
import { OrderWebhookController } from './controllers/v1/order-webhook.controller';
import { Order } from './entities/order.entity';
import { Ticket } from './entities/ticket.entity';
import { OrderRepository } from './services/order.repository';
import { OrderService } from './services/order.service';
import { XenditService } from './services/xendit.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Ticket, Event]), QueueModule],
  controllers: [OrderController, OrderWebhookController],
  providers: [
    OrderApplication,
    OrderService,
    OrderRepository,
    XenditService,
    RolesGuard,
  ],
})
export class OrderModule {}
