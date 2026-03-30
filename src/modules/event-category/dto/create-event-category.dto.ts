import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateEventCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nama kategori wajib diisi')
    .max(255, 'Nama kategori maksimal 255 karakter'),
  description: z
    .string()
    .trim()
    .max(2000, 'Deskripsi maksimal 2000 karakter')
    .optional(),
});

export class CreateEventCategoryDto extends createZodDto(
  CreateEventCategorySchema,
) {}
