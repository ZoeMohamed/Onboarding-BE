import { CacheInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { CACHE_KEY_PREFIX } from '../constants/cache.constant';
import { UserRole } from '../enums/user-role.enum';

type RequestWithUser = {
  query?: Record<string, unknown>;
  user?: { role?: UserRole };
};

@Injectable()
export class EventsListCacheInterceptor extends CacheInterceptor {
  protected trackBy(context: ExecutionContext): string | undefined {
    const key = super.trackBy(context);

    if (!key) {
      return undefined;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const scope =
      request.user?.role === UserRole.ADMIN ? UserRole.ADMIN : 'PUBLIC';

    return `${CACHE_KEY_PREFIX.eventsList}${scope}:${this.serializeQuery(
      request.query,
    )}`;
  }

  private serializeQuery(query?: Record<string, unknown>): string {
    if (!query) {
      return 'all';
    }

    const entries = Object.entries(query)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => [key, this.serializeValue(value)] as const)
      .sort(([a], [b]) => a.localeCompare(b));

    if (entries.length === 0) {
      return 'all';
    }

    return entries.map(([key, value]) => `${key}=${value}`).join('&');
  }

  private serializeValue(value: unknown): string {
    if (Array.isArray(value)) {
      return value.map((item) => this.serializeValue(item)).join(',');
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }

    return String(value);
  }
}
