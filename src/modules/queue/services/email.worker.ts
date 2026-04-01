import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_EMAIL } from '../constants/queue.constant';

@Injectable()
@Processor(QUEUE_EMAIL)
export class EmailWorker extends WorkerHost {
  private readonly logger = new Logger(EmailWorker.name);

  async process(job: Job): Promise<void> {
    this.logger.log(
      `Processing ${QUEUE_EMAIL} job id=${job.id} name=${job.name} data=${JSON.stringify(job.data)}`,
    );
  }
}
