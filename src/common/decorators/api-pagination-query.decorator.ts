import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

type ExtraQueryOption = {
  name: string;
  description?: string;
  example?: unknown;
  required?: boolean;
};

type ApiPaginationQueryOptions = {
  includeSearch?: boolean;
  searchDescription?: string;
  searchExample?: string;
  extras?: ExtraQueryOption[];
};

export const ApiPaginationQuery = (
  options: ApiPaginationQueryOptions = {},
) => {
  const decorators = [
    ApiQuery({
      name: 'page',
      required: false,
      description: 'Default 1',
      example: 1,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      description: 'Default 10, max 100',
      example: 10,
    }),
  ];

  if (options.includeSearch) {
    decorators.push(
      ApiQuery({
        name: 'search',
        required: false,
        description: options.searchDescription ?? 'Search keyword',
        example: options.searchExample ?? 'music',
      }),
    );
  }

  for (const extra of options.extras ?? []) {
    decorators.push(
      ApiQuery({
        name: extra.name,
        required: extra.required ?? false,
        description: extra.description,
        example: extra.example,
      }),
    );
  }

  return applyDecorators(...decorators);
};
