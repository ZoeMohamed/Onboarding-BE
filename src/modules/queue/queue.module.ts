import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../order/entities/order.entity';
import { Ticket } from '../order/entities/ticket.entity';
import { StorageModule } from '../storage/storage.module';
import { QUEUE_EMAIL, QUEUE_TICKET } from './constants/queue.constant';
import { EmailWorker } from './services/email.worker';
import { TicketWorker } from './services/ticket.worker';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, Order]),
    StorageModule,
    BullModule.registerQueue(
      {
        name: QUEUE_TICKET,
      },
      {
        name: QUEUE_EMAIL,
      },
    ),
  ],
  providers: [TicketWorker, EmailWorker],
  exports: [BullModule],
})
export class QueueModule {}
