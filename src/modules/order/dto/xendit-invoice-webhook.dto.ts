import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const XenditInvoiceWebhookSchema = z
  .object({
    id: z.string().trim().min(1, 'invoice id wajib diisi'),
    external_id: z.string().trim().min(1, 'external_id wajib diisi'),
    status: z.string().trim().min(1, 'status wajib diisi'),
    invoice_url: z.string().trim().url().optional(),
    payer_email: z.string().trim().email().optional(),
    paid_amount: z.coerce.number().optional(),
    amount: z.coerce.number().optional(),
  })
  .passthrough();

export class XenditInvoiceWebhookDto extends createZodDto(
  XenditInvoiceWebhookSchema,
) {}
