import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Repository } from 'typeorm';
import { Ticket } from '../../order/entities/ticket.entity';
import { StorageService } from '../../storage/services/storage.service';
import {
  JOB_GENERATE_TICKET_ASSETS,
  QUEUE_TICKET,
} from '../constants/queue.constant';

type GenerateTicketAssetsPayload = {
  orderId: string;
  tickets: Array<{
    id: string;
    ticketCode: string;
  }>;
};

@Injectable()
@Processor(QUEUE_TICKET)
export class TicketWorker extends WorkerHost {
  private readonly logger = new Logger(TicketWorker.name);

  constructor(
    private readonly storageService: StorageService,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_GENERATE_TICKET_ASSETS) {
      this.logger.log(
        `Skip unknown ${QUEUE_TICKET} job id=${job.id} name=${job.name}`,
      );
      return;
    }

    if (!this.storageService.isEnabled()) {
      this.logger.warn(
        `Skip ${QUEUE_TICKET} asset generation job id=${job.id} because Cloudinary is not configured`,
      );
      return;
    }

    const payload = this.validatePayload(job.data);
    if (!payload) {
      this.logger.warn(
        `Skip ${QUEUE_TICKET} job id=${job.id} due to invalid payload`,
      );
      return;
    }

    this.logger.log(
      `Start ${QUEUE_TICKET} asset generation job id=${job.id} orderId=${payload.orderId} tickets=${payload.tickets.length}`,
    );

    const failures: string[] = [];

    for (const ticket of payload.tickets) {
      try {
        await this.generateAndStoreTicketAssets(payload.orderId, ticket);
      } catch (error) {
        failures.push(ticket.id);
        this.logger.error(
          `Failed generating assets orderId=${payload.orderId} ticketId=${ticket.id}: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
    }

    if (failures.length > 0) {
      throw new Error(
        `Failed generating assets for ${failures.length} tickets`,
      );
    }

    this.logger.log(
      `Completed ${QUEUE_TICKET} asset generation job id=${job.id} orderId=${payload.orderId}`,
    );
  }

  private validatePayload(data: unknown): GenerateTicketAssetsPayload | null {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const payload = data as GenerateTicketAssetsPayload;

    if (!payload.orderId || !Array.isArray(payload.tickets)) {
      return null;
    }

    const validTickets = payload.tickets.filter(
      (ticket) => ticket?.id && ticket?.ticketCode,
    );

    if (validTickets.length === 0) {
      return null;
    }

    return {
      orderId: payload.orderId,
      tickets: validTickets,
    };
  }

  private async generateAndStoreTicketAssets(
    orderId: string,
    ticket: { id: string; ticketCode: string },
  ): Promise<void> {
    const qrPayload = JSON.stringify({
      orderId,
      ticketId: ticket.id,
      ticketCode: ticket.ticketCode,
    });

    const qrBuffer = await this.generateQrPngBuffer(qrPayload);
    const pdfBuffer = await this.generateTicketPdfBuffer({
      orderId,
      ticketCode: ticket.ticketCode,
      qrBuffer,
    });

    const qrKey = `orders/${orderId}/tickets/${ticket.id}/qr`;
    const pdfKey = `orders/${orderId}/tickets/${ticket.id}/ticket`;

    const [qrCodeUrl, pdfUrl] = await Promise.all([
      this.storageService.uploadImagePng(qrKey, qrBuffer),
      this.storageService.uploadPdf(pdfKey, pdfBuffer),
    ]);

    if (!qrCodeUrl || !pdfUrl) {
      throw new Error('Storage upload returned empty URL');
    }

    await this.ticketRepository.update(
      {
        id: ticket.id,
      },
      {
        qrCodeUrl,
        pdfUrl,
      },
    );
  }

  private generateQrPngBuffer(content: string): Promise<Buffer> {
    return QRCode.toBuffer(content, {
      type: 'png',
      width: 512,
      margin: 1,
      errorCorrectionLevel: 'M',
    });
  }

  private generateTicketPdfBuffer(data: {
    orderId: string;
    ticketCode: string;
    qrBuffer: Buffer;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const document = new PDFDocument({
        size: 'A4',
        margin: 40,
      });
      const chunks: Buffer[] = [];

      document.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);

      document
        .fontSize(24)
        .text('DOT Ticket', { align: 'center' })
        .moveDown(1.2);

      document.fontSize(12).text(`Order ID: ${data.orderId}`);
      document.text(`Ticket Code: ${data.ticketCode}`);
      document.moveDown(1.4);

      document.image(data.qrBuffer, {
        fit: [220, 220],
        align: 'center',
      });

      document.moveDown(1.2);
      document
        .fontSize(10)
        .fillColor('#444444')
        .text(
          'Tunjukkan QR ini saat check-in. Simpan file ini sebagai bukti tiket.',
        );

      document.end();
    });
  }
}
