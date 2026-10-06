import { PrismaClient, UserRole } from "@prisma/client";

export function getAdminEmail(env: NodeJS.ProcessEnv): string {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("ADMIN_EMAIL não está configurado com um e-mail válido");
  }
  return email;
}

export async function promoteExistingAdmin(
  prisma: PrismaClient,
  adminEmail: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const admin = await tx.user.findUnique({
      where: { email: adminEmail },
      select: { id: true },
    });
    if (!admin) {
      throw new Error(
        "Conta administrativa existente não encontrada; nenhuma conta foi criada",
      );
    }

    const otherAdmins = await tx.user.count({
      where: { role: UserRole.ADMIN, id: { not: admin.id } },
    });
    if (otherAdmins !== 0) {
      throw new Error(
        "Há outras contas ADMIN; interrompido sem alterar papéis",
      );
    }

    await tx.user.update({
      where: { id: admin.id },
      data: { role: UserRole.ADMIN },
      select: { id: true },
    });
  });
}

async function main(): Promise<void> {
  const adminEmail = getAdminEmail(process.env);
  const prisma = new PrismaClient();
  try {
    await promoteExistingAdmin(prisma, adminEmail);
    console.log("Papel administrativo confirmado para uma conta existente");
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(
      error instanceof Error
        ? error.message
        : "Falha ao configurar papel administrativo",
    );
    process.exitCode = 1;
  });
}
