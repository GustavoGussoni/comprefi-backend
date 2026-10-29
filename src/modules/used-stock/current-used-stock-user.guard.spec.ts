import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUsedStockUserGuard } from "./current-used-stock-user.guard";

function context(user?: { id?: string; role?: UserRole }) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as never;
}

describe("CurrentUsedStockUserGuard", () => {
  const findUnique = jest.fn();
  const guard = new CurrentUsedStockUserGuard({
    user: { findUnique },
  } as never);

  beforeEach(() => jest.resetAllMocks());

  it("aceita ADMIN e SALES cujo papel atual ainda coincide com o JWT", async () => {
    findUnique.mockResolvedValue({ id: "u-1", role: UserRole.SALES });
    await expect(guard.canActivate(context({ id: "u-1", role: UserRole.SALES }))).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "u-1" },
      select: { id: true, role: true },
    });
  });

  it("recusa ausência de sujeito autenticado", async () => {
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("recusa usuário apagado e token com papel desatualizado", async () => {
    findUnique.mockResolvedValueOnce(null);
    await expect(
      guard.canActivate(context({ id: "deleted", role: UserRole.ADMIN })),
    ).rejects.toBeInstanceOf(ForbiddenException);

    findUnique.mockResolvedValueOnce({ id: "u-1", role: UserRole.ADMIN });
    await expect(
      guard.canActivate(context({ id: "u-1", role: UserRole.SALES })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
