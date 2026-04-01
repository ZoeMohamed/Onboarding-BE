import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateEventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Judul event wajib diisi')
      .max(255, 'Judul event maksimal 255 karakter')
      .optional(),
    description: z
      .union([z.string().trim().max(5000, 'Deskripsi maksimal 5000 karakter'), z.null()])
      .optional(),
    location: z
      .string()
      .trim()
      .min(1, 'Lokasi wajib diisi')
      .max(255, 'Lokasi maksimal 255 karakter')
      .optional(),
    startDate: z.coerce
      .date({
        message: 'Format startDate tidak valid',
      })
      .optional(),
    endDate: z.coerce
      .date({
        message: 'Format endDate tidak valid',
      })
      .optional(),
    price: z.coerce.number().positive('Harga event harus lebih dari 0').optional(),
    totalTickets: z.coerce
      .number()
      .int('totalTickets harus integer')
      .min(1, 'totalTickets minimal 1')
      .optional(),
    categoryId: z.string().uuid('Format categoryId tidak valid').optional(),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.description !== undefined ||
      value.location !== undefined ||
      value.startDate !== undefined ||
      value.endDate !== undefined ||
      value.price !== undefined ||
      value.totalTickets !== undefined ||
      value.categoryId !== undefined,
    {
      message: 'Minimal satu field harus diisi',
    },
  )
  .refine(
    (value) => {
      if (!value.startDate || !value.endDate) {
        return true;
      }
      return value.endDate > value.startDate;
    },
    {
      message: 'endDate harus setelah startDate',
      path: ['endDate'],
    },
  );

export class UpdateEventDto extends createZodDto(UpdateEventSchema) {}
