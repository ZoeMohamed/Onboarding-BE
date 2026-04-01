import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateEventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Judul event wajib diisi')
      .max(255, 'Judul event maksimal 255 karakter'),
    description: z
      .string()
      .trim()
      .max(5000, 'Deskripsi maksimal 5000 karakter')
      .optional(),
    location: z
      .string()
      .trim()
      .min(1, 'Lokasi wajib diisi')
      .max(255, 'Lokasi maksimal 255 karakter'),
    startDate: z.coerce.date({
      message: 'Format startDate tidak valid',
    }),
    endDate: z.coerce.date({
      message: 'Format endDate tidak valid',
    }),
    price: z.coerce.number().positive('Harga event harus lebih dari 0'),
    totalTickets: z.coerce
      .number()
      .int('totalTickets harus integer')
      .min(1, 'totalTickets minimal 1'),
    categoryId: z.string().uuid('Format categoryId tidak valid'),
  })
  .refine((value) => value.endDate > value.startDate, {
    message: 'endDate harus setelah startDate',
    path: ['endDate'],
  });

export class CreateEventDto extends createZodDto(CreateEventSchema) {}
