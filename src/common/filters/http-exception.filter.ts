import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { user?: { id?: string } }>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message = this.resolveMessage(exceptionResponse);
    const errors = this.resolveErrors(exception, exceptionResponse);
    const method = request.method;
    const path = request.url;
    const userId = request.user?.id ?? 'anonymous';

    if (status >= 500) {
      this.logger.error(
        `${method} ${path} ${status} user=${userId}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`${method} ${path} ${status} user=${userId}`);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path,
      method,
      message,
      ...(errors.length > 0 ? { errors } : {}),
    });
  }

  private resolveMessage(
    exceptionResponse: unknown,
  ): string | string[] {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const message = (exceptionResponse as { message?: unknown }).message;

      if (typeof message === 'string') {
        return message;
      }

      if (
        Array.isArray(message) &&
        message.every((item) => typeof item === 'string')
      ) {
        return message as string[];
      }

      if (message !== undefined && message !== null) {
        return String(message);
      }
    }

    return 'Internal server error';
  }

  private resolveErrors(
    exception: unknown,
    exceptionResponse: unknown,
  ): Array<{ path?: string; message: string }> {
    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError() as
        | {
            issues?: Array<{
              path?: unknown[];
              message?: string;
            }>;
          }
        | undefined;

      if (!Array.isArray(zodError?.issues)) {
        return [];
      }

      return zodError.issues.map((issue) => ({
        path: Array.isArray(issue.path)
          ? issue.path
              .map((segment) => String(segment))
              .join('.')
          : undefined,
        message: issue.message ?? 'Validation error',
      }));
    }

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const message = (exceptionResponse as { message?: unknown }).message;

      if (
        Array.isArray(message) &&
        message.every((item) => typeof item === 'string')
      ) {
        return message.map((item) => ({ message: item }));
      }
    }

    return [];
  }
}
