import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<{
      method: string;
      url: string;
      ip?: string;
      user?: { id?: string };
    }>();
    const response = httpContext.getResponse<{ statusCode?: number }>();
    const method = request.method;
    const url = request.url;
    const ip = request.ip ?? '-';
    const userId = request.user?.id ?? 'anonymous';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          const statusCode = response.statusCode ?? 200;
          this.logger.log(
            `${method} ${url} ${statusCode} ${duration}ms ip=${ip} user=${userId}`,
          );
        },
        error: (error: unknown) => {
          const duration = Date.now() - start;
          const statusCode =
            error instanceof HttpException
              ? error.getStatus()
              : response.statusCode ?? 500;

          const message = `${method} ${url} ${statusCode} ${duration}ms ip=${ip} user=${userId}`;

          if (statusCode >= 500) {
            this.logger.error(
              message,
              error instanceof Error ? error.stack : undefined,
            );
            return;
          }

          this.logger.warn(message);
        },
      }),
    );
  }
}
