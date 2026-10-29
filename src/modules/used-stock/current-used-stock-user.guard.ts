import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";

type JwtRequest = {
  user?: {
    id?: string;
    role?: UserRole;
  };
};

/**
 * JWT verification proves the token was issued, but not that its subject still
 * exists or still holds the role embedded in the token. This guard closes that
 * stale-token window only for the isolated used-stock administration routes.
 */
@Injectable()
export class CurrentUsedStockUserGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<JwtRequest>();
    const tokenUser = request.user;
    if (!tokenUser?.id || !tokenUser.role) {
      throw new UnauthorizedException();
    }

    const current = await this.prisma.user.findUnique({
      where: { id: tokenUser.id },
      select: { id: true, role: true },
    });

    if (
      !current ||
      current.role !== tokenUser.role ||
      (current.role !== UserRole.ADMIN && current.role !== UserRole.SALES)
    ) {
      throw new ForbiddenException(
        "O usuário autenticado não possui mais permissão para administrar seminovos.",
      );
    }

    return true;
  }
}
