import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface AdminAccountConfig {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Variável obrigatória ausente: ${name}`);
  }

  return value;
}

function loadAccounts(): AdminAccountConfig[] {
  return [
    {
      name: requiredEnvironment('ADMIN_NAME'),
      email: requiredEnvironment('ADMIN_EMAIL').toLowerCase(),
      password: requiredEnvironment('ADMIN_PASSWORD'),
      role: UserRole.ADMIN,
    },
    {
      name: requiredEnvironment('SALES_NAME'),
      email: requiredEnvironment('SALES_EMAIL').toLowerCase(),
      password: requiredEnvironment('SALES_PASSWORD'),
      role: UserRole.SALES,
    },
  ];
}

async function main() {
  const accounts = loadAccounts();

  for (const account of accounts) {
    if (account.password.length < 10) {
      throw new Error(`A senha de ${account.email} deve ter ao menos 10 caracteres`);
    }

    const password = await bcrypt.hash(account.password, 12);

    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {
        name: account.name,
        password,
        role: account.role,
      },
      create: {
        name: account.name,
        email: account.email,
        password,
        role: account.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    console.log(`Conta provisionada: ${user.email} (${user.role})`);
  }
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`Falha ao provisionar contas: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
