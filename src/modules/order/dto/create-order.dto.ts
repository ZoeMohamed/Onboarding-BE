import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateOrderSchema = z.object({
  eventId: z.string().uuid('Format eventId tidak valid'),
  quantity: z.coerce
    .number()
    .int('quantity harus integer')
    .min(1, 'quantity minimal 1'),
});

export class CreateOrderDto extends createZodDto(CreateOrderSchema) {}
