import { PrismaClient, UserRole } from "@prisma/client";
import {
  getAdminEmail,
  promoteExistingAdmin,
} from "../../prisma/promote-admin-role";

describe("promoteExistingAdmin", () => {
  const adminId = "existing-admin-id";
  const adminEmail = "admin@example.invalid";
  const user = {
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
  };
  const db = {
    $transaction: jest.fn(
      async (callback: (tx: { user: typeof user }) => Promise<unknown>) =>
        callback({ user }),
    ),
  } as unknown as PrismaClient;

  beforeEach(() => {
    jest.clearAllMocks();
    user.findUnique.mockResolvedValue({ id: adminId });
    user.count.mockResolvedValue(0);
    user.update.mockResolvedValue({ id: adminId });
  });

  it("exige a identidade administrativa configurada", () => {
    expect(() => getAdminEmail({})).toThrow("ADMIN_EMAIL");
    expect(() => getAdminEmail({ ADMIN_EMAIL: "invalido" })).toThrow(
      "ADMIN_EMAIL",
    );
    expect(getAdminEmail({ ADMIN_EMAIL: " ADMIN@EXAMPLE.INVALID " })).toBe(
      adminEmail,
    );
  });

  it("promove só a conta existente, sem criar usuário ou alterar a senha", async () => {
    await promoteExistingAdmin(db, adminEmail);
    expect(user.findUnique).toHaveBeenCalledWith({
      where: { email: adminEmail },
      select: { id: true },
    });
    expect(user.count).toHaveBeenCalledWith({
      where: { role: UserRole.ADMIN, id: { not: adminId } },
    });
    expect(user.update).toHaveBeenCalledWith({
      where: { id: adminId },
      data: { role: UserRole.ADMIN },
      select: { id: true },
    });
    expect(user.create).not.toHaveBeenCalled();
    expect(user.upsert).not.toHaveBeenCalled();
  });

  it("falha sem conta existente antes de qualquer escrita", async () => {
    user.findUnique.mockResolvedValueOnce(null);
    await expect(promoteExistingAdmin(db, adminEmail)).rejects.toThrow(
      "não encontrada",
    );
    expect(user.update).not.toHaveBeenCalled();
  });

  it("interrompe diante de outro ADMIN, sem mudar papéis", async () => {
    user.count.mockResolvedValueOnce(1);
    await expect(promoteExistingAdmin(db, adminEmail)).rejects.toThrow(
      "outras contas ADMIN",
    );
    expect(user.update).not.toHaveBeenCalled();
  });

  it("pode ser executado novamente para a mesma conta", async () => {
    await promoteExistingAdmin(db, adminEmail);
    await promoteExistingAdmin(db, adminEmail);
    expect(user.update).toHaveBeenCalledTimes(2);
    expect(
      user.update.mock.calls.every(
        (call) => call[0].data.role === UserRole.ADMIN,
      ),
    ).toBe(true);
  });
});
