import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_EMAIL, QUEUE_TICKET } from './constants/queue.constant';
import { EmailWorker } from './services/email.worker';
import { TicketWorker } from './services/ticket.worker';

@Module({
  imports: [
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
