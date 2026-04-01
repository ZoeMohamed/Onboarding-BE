import { BadRequestException } from '@nestjs/common';
import { createZodValidationPipe } from 'nestjs-zod';

type ZodIssue = {
  path?: unknown[];
  message?: string;
};

const resolveIssues = (
  error: unknown,
): Array<{ path?: string; message: string }> => {
  if (
    typeof error !== 'object' ||
    error === null ||
    !Array.isArray((error as { issues?: unknown[] }).issues)
  ) {
    return [];
  }

  return ((error as { issues: ZodIssue[] }).issues ?? []).map((issue) => ({
    path: Array.isArray(issue.path)
      ? issue.path
          .map((segment) => String(segment))
          .join('.')
      : undefined,
    message: issue.message ?? 'Validation error',
  }));
};

export const AppZodValidationPipe = createZodValidationPipe({
  createValidationException: (error: unknown) =>
    new BadRequestException({
      message: 'Validation failed',
      errors: resolveIssues(error),
    }),
});
