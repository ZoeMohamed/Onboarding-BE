import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { OrderApplication } from '../../applications/order.application';
import { XenditInvoiceWebhookDto } from '../../dto/xendit-invoice-webhook.dto';

@ApiTags('Order Payments')
@Controller({ path: 'orders/webhooks/xendit', version: '1' })
export class OrderWebhookController {
  constructor(private readonly application: OrderApplication) {}

  @ApiOperation({ summary: 'Xendit invoice webhook callback' })
  @ApiOkResponse({ description: 'Webhook berhasil diproses' })
  @ApiUnauthorizedResponse({ description: 'Token webhook tidak valid' })
  @HttpCode(200)
  @Post('invoices')
  invoiceWebhook(
    @Headers('x-callback-token') callbackToken: string | undefined,
    @Body() payload: XenditInvoiceWebhookDto,
  ) {
    return this.application.handleXenditInvoiceWebhook(callbackToken, payload);
  }
}
