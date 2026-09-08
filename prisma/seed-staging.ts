import {
  CrmDeliveryStatus,
  Prisma,
  PrismaClient,
  UserRole,
} from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_PREFIX = "stg_demo_";

function assertStagingEnvironment(): void {
  if (process.env.NODE_ENV !== "staging") {
    throw new Error(
      "O seed sintético só pode ser executado com NODE_ENV=staging."
    );
  }
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

async function seedCatalog(adminId: string): Promise<void> {
  const groups = [
    {
      slug: "staging-iphone-17-pro",
      model: "iPhone 17 Pro",
      category: "iPhones Novos",
      section: "Dados demonstrativos",
      specs: "Produto sintético para validação do ambiente de staging.",
      details: "Aparelho novo · dados demonstrativos",
      battery: "100%",
      storages: ["256GB", "512GB"],
      sortOrder: 1,
      variants: [
        {
          storage: "256GB",
          color: "Prata",
          originalPrice: "R$ 8.112,00",
          installmentPrice: "R$ 712,17",
          pixPrice: "R$ 7.495,00",
        },
        {
          storage: "256GB",
          color: "Laranja",
          originalPrice: "R$ 7.936,00",
          installmentPrice: "R$ 696,68",
          pixPrice: "R$ 7.332,00",
        },
        {
          storage: "512GB",
          color: "Prata",
          originalPrice: "R$ 9.934,00",
          installmentPrice: "R$ 872,16",
          pixPrice: "R$ 9.179,00",
        },
      ],
    },
    {
      slug: "staging-iphone-16",
      model: "iPhone 16",
      category: "iPhones Novos",
      section: "Dados demonstrativos",
      specs: "Produto sintético para validação do ambiente de staging.",
      details: "Aparelho novo · dados demonstrativos",
      battery: "100%",
      storages: ["128GB"],
      sortOrder: 2,
      variants: [
        {
          storage: "128GB",
          color: "Preto",
          originalPrice: "R$ 5.112,00",
          installmentPrice: "R$ 448,80",
          pixPrice: "R$ 4.723,00",
        },
        {
          storage: "128GB",
          color: "Branco",
          originalPrice: "R$ 5.112,00",
          installmentPrice: "R$ 448,80",
          pixPrice: "R$ 4.723,00",
        },
      ],
    },
  ];

  for (const groupData of groups) {
    const { variants, ...group } = groupData;
    const productGroup = await prisma.productGroup.upsert({
      where: { slug: group.slug },
      update: { ...group, isActive: true },
      create: { ...group, isActive: true },
    });

    for (const variant of variants) {
      await prisma.productVariant.upsert({
        where: {
          productGroupId_storage_color: {
            productGroupId: productGroup.id,
            storage: variant.storage,
            color: variant.color,
          },
        },
        update: { ...variant, isActive: true },
        create: {
          ...variant,
          productGroupId: productGroup.id,
          isActive: true,
        },
      });
    }
  }

  const legacyProducts = [
    {
      id: "00000000-0000-4000-8000-000000000171",
      model: "iPhone 17 Pro 256GB Prata",
      storage: "256GB",
      color: "Prata",
      originalPrice: "R$ 8.112,00",
      installmentPrice: "R$ 712,17",
      pixPrice: "R$ 7.495,00",
      specs: "Produto sintético para staging",
    },
    {
      id: "00000000-0000-4000-8000-000000000172",
      model: "iPhone 17 Pro 256GB Laranja",
      storage: "256GB",
      color: "Laranja",
      originalPrice: "R$ 7.936,00",
      installmentPrice: "R$ 696,68",
      pixPrice: "R$ 7.332,00",
      specs: "Produto sintético para staging",
    },
    {
      id: "00000000-0000-4000-8000-000000000160",
      model: "iPhone 16 128GB Preto",
      storage: "128GB",
      color: "Preto",
      originalPrice: "R$ 5.112,00",
      installmentPrice: "R$ 448,80",
      pixPrice: "R$ 4.723,00",
      specs: "Produto sintético para staging",
    },
  ];

  for (const product of legacyProducts) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {
        ...product,
        battery: "100%",
        details: "Aparelho novo · dados demonstrativos",
        image: "",
        realImages: [],
        category: "iPhones Novos",
        isNew: true,
        isActive: true,
        userId: adminId,
      },
      create: {
        ...product,
        battery: "100%",
        details: "Aparelho novo · dados demonstrativos",
        image: "",
        realImages: [],
        category: "iPhones Novos",
        isNew: true,
        isActive: true,
        userId: adminId,
      },
    });
  }
}

async function seedTradeValues(): Promise<void> {
  const values = [
    { modelo: "iPhone 13", capacidade: "128GB", valorBase: 2800 },
    { modelo: "iPhone 14 Plus", capacidade: "128GB", valorBase: 3400 },
    { modelo: "iPhone 15 Pro", capacidade: "256GB", valorBase: 4400 },
    { modelo: "iPhone 16 Pro Max", capacidade: "256GB", valorBase: 5200 },
  ];

  for (const value of values) {
    await prisma.valorTroca.upsert({
      where: {
        modelo_capacidade: {
          modelo: value.modelo,
          capacidade: value.capacidade,
        },
      },
      update: { valorBase: value.valorBase, ativo: true },
      create: { ...value, ativo: true },
    });
  }
}

async function seedSimulations(): Promise<void> {
  const now = new Date();
  const simulations: Prisma.QuestionarioTrocaUncheckedCreateInput[] = [
    {
      id: `${DEMO_PREFIX}sent`,
      modeloAtual: "iPhone 13",
      capacidadeAtual: "128GB",
      corAtual: "Azul",
      bateriaAtual: 88,
      defeitos: [],
      pecasTrocadas: false,
      modeloDesejado: "iPhone 17 Pro 256GB Prata",
      produtoDesejadoNome: "iPhone 17 Pro 256GB Prata",
      ondeOuviu: "Instagram",
      tempoPensando: "Há 1 mês",
      urgenciaTroca: "Agora mesmo",
      valorBase: 2800,
      depreciacaoBateria: 336,
      depreciacaoDefeitos: 0,
      valorAparelho: 2464,
      precoProduto: 7495,
      valorFinal: 5031,
      valorComDesconto: 4880.07,
      descontoPercentual: 3,
      cupomDesconto: "STAGING-DEMO-01",
      offerExpiresAt: addMinutes(now, 22),
      temDefeito: false,
      precisaCotacao: false,
      nome: "Marina Demonstração",
      email: "marina.demo@example.com",
      whatsapp: "(00) 00000-0001",
      cep: "00000-001",
      mensagemFollowUp: "Registro sintético de staging. Não contatar.",
      crmStatus: CrmDeliveryStatus.SENT,
      crmAttempts: 1,
      crmLastAttemptAt: addMinutes(now, -8),
      crmSentAt: addMinutes(now, -8),
      crmExternalId: "demo-datacrazy-1001",
      etapaAtual: 8,
      concluido: true,
      createdAt: addMinutes(now, -10),
    },
    {
      id: `${DEMO_PREFIX}failed`,
      modeloAtual: "iPhone 14 Plus",
      capacidadeAtual: "128GB",
      corAtual: "Preto",
      bateriaAtual: 85,
      defeitos: ["camera"] as Prisma.InputJsonValue,
      pecasTrocadas: false,
      modeloDesejado: "iPhone 17 Pro 256GB Laranja",
      produtoDesejadoNome: "iPhone 17 Pro 256GB Laranja",
      ondeOuviu: "Indicação",
      tempoPensando: "Há 2 semanas",
      urgenciaTroca: "Este mês",
      valorBase: 3400,
      depreciacaoBateria: 510,
      depreciacaoDefeitos: 350,
      valorAparelho: 2540,
      precoProduto: 7332,
      valorFinal: 4792,
      valorComDesconto: 4648.24,
      descontoPercentual: 3,
      cupomDesconto: "STAGING-DEMO-02",
      offerExpiresAt: addMinutes(now, 12),
      temDefeito: true,
      precisaCotacao: false,
      nome: "Rafael Demonstração",
      email: "rafael.demo@example.com",
      whatsapp: "(00) 00000-0002",
      cep: "00000-002",
      mensagemFollowUp: "Registro sintético de staging. Não contatar.",
      crmStatus: CrmDeliveryStatus.FAILED,
      crmAttempts: 2,
      crmLastAttemptAt: addMinutes(now, -4),
      crmLastError: "STAGING_DEMO: entrega simulada; nenhum webhook chamado",
      etapaAtual: 8,
      concluido: true,
      createdAt: addMinutes(now, -18),
    },
    {
      id: `${DEMO_PREFIX}incomplete`,
      modeloAtual: "iPhone 15 Pro",
      capacidadeAtual: "256GB",
      corAtual: "Titânio Natural",
      bateriaAtual: 91,
      defeitos: [],
      pecasTrocadas: false,
      modeloDesejado: "iPhone 16 128GB Preto",
      produtoDesejadoNome: "iPhone 16 128GB Preto",
      ondeOuviu: "Google",
      tempoPensando: "Pesquisando agora",
      urgenciaTroca: "Sem pressa",
      valorBase: 4400,
      depreciacaoBateria: 396,
      depreciacaoDefeitos: 0,
      valorAparelho: 4004,
      precoProduto: 4723,
      valorFinal: 719,
      valorComDesconto: 697.43,
      descontoPercentual: 3,
      cupomDesconto: "STAGING-DEMO-03",
      offerExpiresAt: addMinutes(now, -15),
      temDefeito: false,
      precisaCotacao: false,
      crmStatus: CrmDeliveryStatus.NOT_SENT,
      crmAttempts: 0,
      etapaAtual: 7,
      concluido: false,
      createdAt: addMinutes(now, -45),
    },
    {
      id: `${DEMO_PREFIX}quote`,
      modeloAtual: "iPhone 16 Pro Max",
      capacidadeAtual: "256GB",
      corAtual: "Titânio Natural",
      bateriaAtual: 82,
      defeitos: ["placa"] as Prisma.InputJsonValue,
      pecasTrocadas: true,
      quaisPecas: "Tela",
      modeloDesejado: "iPhone 17 Pro 256GB Prata",
      produtoDesejadoNome: "iPhone 17 Pro 256GB Prata",
      ondeOuviu: "Instagram",
      tempoPensando: "Há 3 meses",
      urgenciaTroca: "Esta semana",
      valorBase: 5200,
      depreciacaoBateria: 936,
      depreciacaoDefeitos: 0,
      valorAparelho: 0,
      precoProduto: 7495,
      valorFinal: 0,
      valorComDesconto: 0,
      descontoPercentual: 3,
      valorManualUsado: false,
      temDefeito: true,
      precisaCotacao: true,
      nome: "Beatriz Demonstração",
      email: "beatriz.demo@example.com",
      whatsapp: "(00) 00000-0004",
      cep: "00000-004",
      mensagemFollowUp: "Registro sintético de staging. Não contatar.",
      crmStatus: CrmDeliveryStatus.NOT_SENT,
      crmAttempts: 0,
      etapaAtual: 8,
      concluido: true,
      createdAt: addMinutes(now, -90),
    },
  ];

  for (const simulation of simulations) {
    await prisma.questionarioTroca.upsert({
      where: { id: simulation.id },
      update: simulation,
      create: simulation,
    });
  }
}

async function main(): Promise<void> {
  assertStagingEnvironment();

  const admin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN },
    select: { id: true },
  });

  if (!admin) {
    throw new Error(
      "Conta ADMIN ausente. Execute prisma:seed-admin antes do seed de staging."
    );
  }

  await seedCatalog(admin.id);
  await seedTradeValues();
  await seedSimulations();

  const [groups, variants, products, tradeValues, simulations] =
    await prisma.$transaction([
      prisma.productGroup.count(),
      prisma.productVariant.count(),
      prisma.product.count(),
      prisma.valorTroca.count(),
      prisma.questionarioTroca.count({
        where: { id: { startsWith: DEMO_PREFIX } },
      }),
    ]);

  console.log(
    JSON.stringify({
      status: "ok",
      groups,
      variants,
      products,
      tradeValues,
      syntheticSimulations: simulations,
    })
  );
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error(`Falha no seed sintético: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
