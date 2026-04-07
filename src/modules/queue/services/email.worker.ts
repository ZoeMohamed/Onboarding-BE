import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../../../infrastructure/config';
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

  constructor() {
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

    await this.transporter.sendMail({
      from: config.mail.from,
      to: recipientEmail,
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
      `,
    });

    this.logger.log(
      `Email sent job id=${job.id} orderId=${payload.orderId} to=${recipientEmail}`,
    );
  }
}
