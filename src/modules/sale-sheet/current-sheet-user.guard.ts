import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import type { SheetActor } from "./sale-sheet.types";
@Injectable()
export class CurrentSheetUserGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: Partial<SheetActor> }>();
    if (!request.user?.id || !request.user.role)
      throw new UnauthorizedException();
    const current = await this.prisma.user.findUnique({
      where: { id: request.user.id },
      select: { id: true, role: true, name: true, email: true },
    });
    if (
      !current ||
      current.role !== request.user.role ||
      !["ADMIN", "SALES"].includes(current.role)
    )
      throw new ForbiddenException(
        "Usuário não possui mais o papel necessário para fichas de venda.",
      );
    request.user = current;
    return true;
  }
}
