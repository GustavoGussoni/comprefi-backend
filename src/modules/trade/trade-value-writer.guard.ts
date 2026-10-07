import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

const IAGO_EMAIL = 'iago@comprefi.com';

interface RequestWithUser {
  user?: {
    email?: string;
    role?: UserRole;
  };
}

@Injectable()
export class TradeValueWriterGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<RequestWithUser>().user;
    if (user?.role === UserRole.ADMIN) return true;
    return (
      user?.role === UserRole.SALES &&
      user.email?.trim().toLowerCase() === IAGO_EMAIL
    );
  }
}
