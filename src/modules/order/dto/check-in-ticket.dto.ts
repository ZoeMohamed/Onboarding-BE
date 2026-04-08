import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CheckInTicketSchema = z.object({
  qrPayload: z
    .string()
    .trim()
    .min(1, 'qrPayload wajib diisi'),
});

export class CheckInTicketDto extends createZodDto(CheckInTicketSchema) {}
