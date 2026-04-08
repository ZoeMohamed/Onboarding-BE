import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import nodemailer, { Transporter } from 'nodemailer';
import { Repository } from 'typeorm';
import { config } from '../../../infrastructure/config';
import { Order } from '../../order/entities/order.entity';
import {
  JOB_ORDER_PAID_NOTIFICATION,
  QUEUE_EMAIL,
} from '../constants/queue.constant';

type OrderPaidEmailPayload = {
  orderId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  event: {
    id: string;
    title: string;
  };
  quantity: number;
  totalPrice: number;
  status: string;
};

@Injectable()
@Processor(QUEUE_EMAIL)
export class EmailWorker extends WorkerHost {
  private readonly logger = new Logger(EmailWorker.name);
  private readonly transporter: Transporter | null;

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {
    super();

    this.transporter = this.buildTransporter();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_ORDER_PAID_NOTIFICATION) {
      this.logger.log(
        `Skip unknown ${QUEUE_EMAIL} job id=${job.id} name=${job.name}`,
      );
      return;
    }

    const payload = job.data as OrderPaidEmailPayload;
    await this.sendOrderPaidEmail(payload, job);
  }

  private buildTransporter(): Transporter | null {
    if (!config.mail.enabled) {
      this.logger.warn(
        'SMTP disabled. Set SMTP_ENABLED=true and SMTP config to enable email delivery',
      );
      return null;
    }

    if (!config.mail.host || !config.mail.from) {
      this.logger.warn(
        'SMTP host/from missing. Email delivery skipped until env is complete',
      );
      return null;
    }

    return nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      auth:
        config.mail.user || config.mail.pass
          ? {
              user: config.mail.user,
              pass: config.mail.pass,
            }
          : undefined,
    });
  }

  private async sendOrderPaidEmail(
    payload: OrderPaidEmailPayload,
    job: Job,
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `Skip send email job id=${job.id} orderId=${payload.orderId} because SMTP is not configured`,
      );
      return;
    }

    const recipientEmail = payload.user?.email?.trim();
    if (!recipientEmail) {
      this.logger.warn(
        `Skip send email job id=${job.id} orderId=${payload.orderId} because recipient email is empty`,
      );
      return;
    }

    const recipientName = payload.user?.name || 'User';
    const eventTitle = payload.event?.title || 'Event';
    const totalPriceLabel = Number(payload.totalPrice || 0).toLocaleString(
      'id-ID',
    );
    const attachments = await this.buildTicketPdfAttachments(payload.orderId);
    const recipients = this.resolveRecipientEmails(recipientEmail);

    if (recipients.length === 0) {
      throw new Error('Tidak ada email tujuan yang valid');
    }

    await this.transporter.sendMail({
      from: config.mail.from,
      to: recipients,
      subject: `Pembayaran berhasil - Order ${payload.orderId}`,
      text: [
        `Halo ${recipientName},`,
        '',
        'Pembayaran order kamu berhasil.',
        `Order ID: ${payload.orderId}`,
        `Event: ${eventTitle}`,
        `Jumlah tiket: ${payload.quantity}`,
        `Total: Rp ${totalPriceLabel}`,
        `Status: ${payload.status}`,
        '',
        `Tiket PDF terlampir (${attachments.length} file).`,
      ].join('\n'),
      html: `
        <p>Halo ${recipientName},</p>
        <p>Pembayaran order kamu berhasil.</p>
        <ul>
          <li><strong>Order ID:</strong> ${payload.orderId}</li>
          <li><strong>Event:</strong> ${eventTitle}</li>
          <li><strong>Jumlah tiket:</strong> ${payload.quantity}</li>
          <li><strong>Total:</strong> Rp ${totalPriceLabel}</li>
          <li><strong>Status:</strong> ${payload.status}</li>
        </ul>
        <p>Tiket PDF terlampir (${attachments.length} file).</p>
      `,
      attachments,
    });

    this.logger.log(
      `Email sent job id=${job.id} orderId=${payload.orderId} to=${recipients.join(',')}`,
    );
  }

  private async buildTicketPdfAttachments(orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: { tickets: true },
    });

    if (!order?.tickets?.length) {
      throw new Error(`Ticket belum tersedia untuk order ${orderId}`);
    }

    const ticketsWithoutPdf = order.tickets.filter((ticket) => !ticket.pdfUrl);
    if (ticketsWithoutPdf.length > 0) {
      throw new Error(
        `PDF tiket belum siap (${ticketsWithoutPdf.length}/${order.tickets.length})`,
      );
    }

    return order.tickets.map((ticket) => ({
      filename: `${ticket.ticketCode}.pdf`,
      path: ticket.pdfUrl as string,
      contentType: 'application/pdf',
    }));
  }

  private resolveRecipientEmails(primaryEmail: string): string[] {
    const emails = new Set<string>();
    const normalizedPrimaryEmail = this.normalizeEmail(primaryEmail);
    if (normalizedPrimaryEmail) {
      emails.add(normalizedPrimaryEmail);
    }

    const monitorEmail =
      this.normalizeEmail(config.mail.user) ??
      this.extractEmailFromFromField(config.mail.from);

    if (monitorEmail) {
      emails.add(monitorEmail);
    }

    return [...emails];
  }

  private extractEmailFromFromField(value: string): string | null {
    const angleMatch = value.match(/<([^>]+)>/);
    if (angleMatch?.[1]) {
      return this.normalizeEmail(angleMatch[1]);
    }
    return this.normalizeEmail(value);
  }

  private normalizeEmail(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const email = value.trim().toLowerCase();
    if (!email.includes('@')) {
      return null;
    }
    return email;
  }
}
