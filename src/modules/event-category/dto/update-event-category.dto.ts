import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateEventCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Nama kategori wajib diisi')
      .max(255, 'Nama kategori maksimal 255 karakter')
      .optional(),
    description: z
      .union([
        z.string().trim().max(2000, 'Deskripsi maksimal 2000 karakter'),
        z.null(),
      ])
      .optional(),
  })
  .refine(
    (value) => value.name !== undefined || value.description !== undefined,
    {
      message: 'Minimal satu field harus diisi',
    },
  );

export class UpdateEventCategoryDto extends createZodDto(
  UpdateEventCategorySchema,
) {}
