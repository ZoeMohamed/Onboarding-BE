import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { config } from '../../../infrastructure/config';

type CreateInvoiceInput = {
  orderId: string;
  amount: number;
  payerEmail: string;
  description: string;
};

type JsonRecord = Record<string, unknown>;

export type XenditInvoice = {
  id: string;
  externalId: string;
  status: string;
  invoiceUrl: string;
  expiryDate: string | null;
};

const ORDER_EXTERNAL_ID_PREFIX = 'order-';
const DEFAULT_INVOICE_STATUS = 'PENDING';
const DEFAULT_CURRENCY = 'IDR';
const XENDIT_INVOICE_ENDPOINT = '/v2/invoices';

@Injectable()
export class XenditService {
  private readonly logger = new Logger(XenditService.name);

  verifyWebhookToken(callbackToken: string | undefined): void {
    if (!config.xendit.webhookToken) {
      throw new InternalServerErrorException(
        'XENDIT_WEBHOOK_TOKEN belum dikonfigurasi',
      );
    }

    if (!callbackToken || callbackToken !== config.xendit.webhookToken) {
      throw new UnauthorizedException('Token webhook Xendit tidak valid');
    }
  }

  buildExternalId(orderId: string): string {
    return `${ORDER_EXTERNAL_ID_PREFIX}${orderId}`;
  }

  extractOrderIdFromExternalId(externalId: string): string | null {
    if (!externalId.startsWith(ORDER_EXTERNAL_ID_PREFIX)) {
      return null;
    }

    const orderId = externalId.slice(ORDER_EXTERNAL_ID_PREFIX.length);
    return orderId.length > 0 ? orderId : null;
  }

  async createInvoice(input: CreateInvoiceInput): Promise<XenditInvoice> {
    if (process.env.NODE_ENV === 'test') {
      return this.buildMockInvoice(input.orderId);
    }

    if (!config.xendit.secretKey) {
      throw new InternalServerErrorException(
        'XENDIT_SECRET_KEY belum dikonfigurasi',
      );
    }

    const requestBody = {
      external_id: this.buildExternalId(input.orderId),
      amount: input.amount,
      payer_email: input.payerEmail,
      description: input.description,
      currency: DEFAULT_CURRENCY,
      invoice_duration: this.resolveInvoiceDurationSeconds(),
      ...(config.xendit.successRedirectUrl
        ? { success_redirect_url: config.xendit.successRedirectUrl }
        : {}),
      ...(config.xendit.failureRedirectUrl
        ? { failure_redirect_url: config.xendit.failureRedirectUrl }
        : {}),
    };

    const endpoint = `${config.xendit.apiBaseUrl.replace(/\/+$/, '')}${XENDIT_INVOICE_ENDPOINT}`;
    const authorization = Buffer.from(
      `${config.xendit.secretKey}:`,
      'utf-8',
    ).toString('base64');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authorization}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const rawBody = await response.text();
      const jsonBody = this.safeParseJson(rawBody);

      if (!response.ok) {
        this.logger.error(
          `Gagal create invoice Xendit status=${response.status} body=${rawBody}`,
        );
        throw new BadGatewayException('Gagal membuat invoice ke Xendit');
      }

      const invoiceId = this.readString(jsonBody, 'id');
      const invoiceUrl = this.readString(jsonBody, 'invoice_url');
      const status =
        this.readString(jsonBody, 'status') ?? DEFAULT_INVOICE_STATUS;
      const externalId =
        this.readString(jsonBody, 'external_id') ?? requestBody.external_id;
      const expiryDate = this.readString(jsonBody, 'expiry_date');

      if (!invoiceId || !invoiceUrl) {
        this.logger.error(`Respon invoice Xendit tidak valid body=${rawBody}`);
        throw new BadGatewayException('Respon invoice Xendit tidak valid');
      }

      return {
        id: invoiceId,
        externalId,
        status,
        invoiceUrl,
        expiryDate: expiryDate ?? null,
      };
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      this.logger.error(
        `Gagal menghubungi Xendit: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw new BadGatewayException('Gagal menghubungi Xendit');
    }
  }

  private buildMockInvoice(orderId: string): XenditInvoice {
    const now = Date.now();
    const expiresAt = new Date(
      now + this.resolveInvoiceDurationSeconds() * 1000,
    ).toISOString();
    const baseUrl = config.app.baseUrl || 'http://localhost:3000';

    return {
      id: `mock-invoice-${orderId.slice(0, 8)}-${now}`,
      externalId: this.buildExternalId(orderId),
      status: DEFAULT_INVOICE_STATUS,
      invoiceUrl: `${baseUrl}/mock-xendit-invoice/${orderId}`,
      expiryDate: expiresAt,
    };
  }

  private resolveInvoiceDurationSeconds(): number {
    const value = Number(config.xendit.invoiceDurationSeconds);
    if (!Number.isFinite(value) || value <= 0) {
      return 86400;
    }
    return Math.floor(value);
  }

  private safeParseJson(body: string): JsonRecord | null {
    if (!body) {
      return null;
    }

    try {
      const parsed = JSON.parse(body) as unknown;
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as JsonRecord;
      }
      return null;
    } catch {
      return null;
    }
  }

  private readString(
    payload: JsonRecord | null,
    key: string,
  ): string | undefined {
    const value = payload?.[key];
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
}
