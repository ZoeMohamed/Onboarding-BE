import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const toNumber = (value: unknown, fallback: number): number => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return Number(value);
  }

  return Number.NaN;
};

const ListEventCategoriesQuerySchema = z.object({
  page: z.preprocess(
    (value) => toNumber(value, 1),
    z.number().int().min(1, 'Page minimal 1'),
  ),
  limit: z.preprocess(
    (value) => toNumber(value, 10),
    z.number().int().min(1, 'Limit minimal 1').max(100, 'Limit maksimal 100'),
  ),
  search: z.preprocess(
    (value) => {
      if (typeof value !== 'string') {
        return undefined;
      }

      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    },
    z.string().max(255, 'Search maksimal 255 karakter').optional(),
  ),
});

export class ListEventCategoriesQueryDto extends createZodDto(
  ListEventCategoriesQuerySchema,
) {}
