import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ISO_DATE_TIME_MESSAGE = 'Format tanggal harus ISO datetime (contoh: 2026-09-01T10:00:00.000Z)';

const IsoDateTimeOptionalSchema = (fieldName: 'startDate' | 'endDate') =>
  z
    .string()
    .trim()
    .datetime({
      offset: true,
      message: `Format ${fieldName} tidak valid`,
    })
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: ISO_DATE_TIME_MESSAGE,
    })
    .optional();

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
    startDate: IsoDateTimeOptionalSchema('startDate'),
    endDate: IsoDateTimeOptionalSchema('endDate'),
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
      return Date.parse(value.endDate) > Date.parse(value.startDate);
    },
    {
      message: 'endDate harus setelah startDate',
      path: ['endDate'],
    },
  );

export class UpdateEventDto extends createZodDto(UpdateEventSchema) {}
