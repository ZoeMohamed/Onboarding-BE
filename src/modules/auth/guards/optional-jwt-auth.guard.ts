import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ headers?: Record<string, string> }>();
    const authHeader = request.headers?.authorization;

    if (!authHeader) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser>(err: unknown, user: TUser | undefined): TUser | undefined {
    if (err) {
      throw err;
    }

    if (!user) {
      throw new UnauthorizedException('Token tidak valid atau kadaluarsa');
    }

    return user;
  }
}
