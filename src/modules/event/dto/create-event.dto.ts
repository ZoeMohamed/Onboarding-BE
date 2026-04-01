import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ISO_DATE_TIME_MESSAGE = 'Format tanggal harus ISO datetime (contoh: 2026-09-01T10:00:00.000Z)';

const IsoDateTimeSchema = (fieldName: 'startDate' | 'endDate') =>
  z
    .string()
    .trim()
    .datetime({
      offset: true,
      message: `Format ${fieldName} tidak valid`,
    })
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: ISO_DATE_TIME_MESSAGE,
    });

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
    startDate: IsoDateTimeSchema('startDate'),
    endDate: IsoDateTimeSchema('endDate'),
    price: z.coerce.number().positive('Harga event harus lebih dari 0'),
    totalTickets: z.coerce
      .number()
      .int('totalTickets harus integer')
      .min(1, 'totalTickets minimal 1'),
    categoryId: z.string().uuid('Format categoryId tidak valid'),
  })
  .refine(
    (value) => {
      const startAt = Date.parse(value.startDate);
      const endAt = Date.parse(value.endDate);
      return endAt > startAt;
    },
    {
      message: 'endDate harus setelah startDate',
      path: ['endDate'],
    },
  );

export class CreateEventDto extends createZodDto(CreateEventSchema) {}
