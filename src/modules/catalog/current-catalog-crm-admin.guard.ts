import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";

/** JWT ADMIN claims can become stale. This guard applies only to SKU writes. */
@Injectable()
export class CurrentCatalogCrmAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: { id?: string; role?: UserRole };
    }>();
    if (!request.user?.id) throw new UnauthorizedException();
    const current = await this.prisma.user.findUnique({
      where: { id: request.user.id },
      select: { id: true, role: true },
    });
    // User has no active/deleted column in the current central schema: absence
    // or current SALES role must deny, regardless of the old token's role.
    if (
      request.user.role !== UserRole.ADMIN ||
      current?.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        "O usuário atual não possui permissão ADMIN para editar SKU do CRM.",
      );
    }
    return true;
  }
}
