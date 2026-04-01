import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_TICKET } from '../constants/queue.constant';

@Injectable()
@Processor(QUEUE_TICKET)
export class TicketWorker extends WorkerHost {
  private readonly logger = new Logger(TicketWorker.name);

  async process(job: Job): Promise<void> {
    this.logger.log(
      `Processing ${QUEUE_TICKET} job id=${job.id} name=${job.name} data=${JSON.stringify(job.data)}`,
    );
  }
}
