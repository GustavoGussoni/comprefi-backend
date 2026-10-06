import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface AuthenticatedRequest {
  user?: { email?: string };
}

@Injectable()
export class AdminIdentityGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const adminEmail = this.configService
      .get<string>("ADMIN_EMAIL")
      ?.trim()
      .toLowerCase();
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userEmail = request.user?.email?.trim().toLowerCase();

    // Falha fechada se a identidade de ADMIN não tiver sido configurada.
    return Boolean(adminEmail && userEmail && userEmail === adminEmail);
  }
}
