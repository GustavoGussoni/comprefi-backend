import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { CurrentCatalogCrmAdminGuard } from "./current-catalog-crm-admin.guard";

describe("CurrentCatalogCrmAdminGuard", () => {
  const findUnique = jest.fn();
  const guard = new CurrentCatalogCrmAdminGuard({
    user: { findUnique },
  } as unknown as PrismaService);
  const context = (user?: { id?: string; role?: UserRole }) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => jest.resetAllMocks());

  it("allows only an existing ADMIN with ADMIN token", async () => {
    findUnique.mockResolvedValue({ id: "admin", role: UserRole.ADMIN });
    expect(
      await guard.canActivate(context({ id: "admin", role: UserRole.ADMIN })),
    ).toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "admin" },
      select: { id: true, role: true },
    });
  });

  it.each([undefined, {}, { role: UserRole.ADMIN }])(
    "rejects missing identity %p",
    async (user) => {
      await expect(guard.canActivate(context(user))).rejects.toThrow(
        UnauthorizedException,
      );
      expect(findUnique).not.toHaveBeenCalled();
    },
  );

  it.each([null, { id: "was-admin", role: UserRole.SALES }])(
    "denies deleted or demoted ADMIN even with old ADMIN JWT: %p",
    async (current) => {
      findUnique.mockResolvedValue(current);
      await expect(
        guard.canActivate(context({ id: "was-admin", role: UserRole.ADMIN })),
      ).rejects.toThrow(ForbiddenException);
    },
  );

  it("denies SALES token even if promoted later", async () => {
    findUnique.mockResolvedValue({ id: "sales", role: UserRole.ADMIN });
    await expect(
      guard.canActivate(context({ id: "sales", role: UserRole.SALES })),
    ).rejects.toThrow(ForbiddenException);
  });
});
