import type { ExecutionContext } from "@nestjs/common";
import { CurrentSheetUserGuard } from "./current-sheet-user.guard";
import { PrismaService } from "../../database/prisma.service";
describe("CurrentSheetUserGuard", () => {
  const context = (request: object) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as ExecutionContext;
  it("rejects missing subject, deleted user, or changed role", async () => {
    const findUnique = jest.fn(async () => null);
    const guard = new CurrentSheetUserGuard({
      user: { findUnique },
    } as unknown as PrismaService);
    await expect(guard.canActivate(context({}))).rejects.toThrow();
    expect(findUnique).not.toHaveBeenCalled();
    await expect(
      guard.canActivate(context({ user: { id: "deleted", role: "ADMIN" } })),
    ).rejects.toThrow();
    findUnique.mockResolvedValue({
      id: "changed",
      role: "SALES",
      name: "Fictício",
      email: "fake@example.test",
    });
    await expect(
      guard.canActivate(context({ user: { id: "changed", role: "ADMIN" } })),
    ).rejects.toThrow();
  });
  it("uses current private user metadata, not JWT supplied name/email", async () => {
    const current = {
      id: "fake",
      role: "SALES",
      name: "Atual Fictício",
      email: "fake@example.test",
    };
    const guard = new CurrentSheetUserGuard({
      user: { findUnique: async () => current },
    } as unknown as PrismaService);
    const request = { user: { id: "fake", role: "SALES", name: "stale" } };
    expect(await guard.canActivate(context(request))).toBe(true);
    expect(request.user).toEqual(current);
  });
});
