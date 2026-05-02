// seed-trade.ts
// Script para popular as tabelas ValorTroca e Product (iPhones Novos para o funil)
// Rodar com: npx ts-node seed-trade.ts
// Ou: npx tsx seed-trade.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================================
// TABELA 1: ValorTroca — Valores base de troca por modelo/capacidade
// ============================================================
// Lógica: valor base = ~40-55% do preço de custo do modelo lacrado equivalente
// Modelos mais antigos = menor percentual (40-45%)
// Modelos mais recentes = maior percentual (50-55%)
// Esses valores são o MÁXIMO que o cliente recebe (bateria 100%, sem defeitos)
// As depreciações (bateria, defeitos) são subtraídas depois

const valoresTroca = [
    // iPhone 13 Series
    { modelo: "iPhone 13", capacidade: "128GB", valorBase: 2800.0 },
    { modelo: "iPhone 13", capacidade: "256GB", valorBase: 3000.0 },
    { modelo: "iPhone 13", capacidade: "512GB", valorBase: 3300.0 },
    { modelo: "iPhone 13 Pro", capacidade: "128GB", valorBase: 3300.0 },
    { modelo: "iPhone 13 Pro", capacidade: "256GB", valorBase: 3500.0 },
    { modelo: "iPhone 13 Pro", capacidade: "512GB", valorBase: 3800.0 },
    { modelo: "iPhone 13 Pro", capacidade: "1TB", valorBase: 4200.0 },
    { modelo: "iPhone 13 Pro Max", capacidade: "128GB", valorBase: 3500.0 },
    { modelo: "iPhone 13 Pro Max", capacidade: "256GB", valorBase: 3700.0 },
    { modelo: "iPhone 13 Pro Max", capacidade: "512GB", valorBase: 4000.0 },
    { modelo: "iPhone 13 Pro Max", capacidade: "1TB", valorBase: 4400.0 },

    // iPhone 14 Series
    { modelo: "iPhone 14", capacidade: "128GB", valorBase: 3200.0 },
    { modelo: "iPhone 14", capacidade: "256GB", valorBase: 3400.0 },
    { modelo: "iPhone 14", capacidade: "512GB", valorBase: 3700.0 },
    { modelo: "iPhone 14 Plus", capacidade: "128GB", valorBase: 3400.0 },
    { modelo: "iPhone 14 Plus", capacidade: "256GB", valorBase: 3600.0 },
    { modelo: "iPhone 14 Plus", capacidade: "512GB", valorBase: 3900.0 },
    { modelo: "iPhone 14 Pro", capacidade: "128GB", valorBase: 3800.0 },
    { modelo: "iPhone 14 Pro", capacidade: "256GB", valorBase: 4000.0 },
    { modelo: "iPhone 14 Pro", capacidade: "512GB", valorBase: 4300.0 },
    { modelo: "iPhone 14 Pro", capacidade: "1TB", valorBase: 4700.0 },
    { modelo: "iPhone 14 Pro Max", capacidade: "128GB", valorBase: 4000.0 },
    { modelo: "iPhone 14 Pro Max", capacidade: "256GB", valorBase: 4200.0 },
    { modelo: "iPhone 14 Pro Max", capacidade: "512GB", valorBase: 4500.0 },
    { modelo: "iPhone 14 Pro Max", capacidade: "1TB", valorBase: 4900.0 },

    // iPhone 15 Series
    { modelo: "iPhone 15", capacidade: "128GB", valorBase: 3600.0 },
    { modelo: "iPhone 15", capacidade: "256GB", valorBase: 3800.0 },
    { modelo: "iPhone 15", capacidade: "512GB", valorBase: 4100.0 },
    { modelo: "iPhone 15 Plus", capacidade: "128GB", valorBase: 3800.0 },
    { modelo: "iPhone 15 Plus", capacidade: "256GB", valorBase: 4000.0 },
    { modelo: "iPhone 15 Plus", capacidade: "512GB", valorBase: 4300.0 },
    { modelo: "iPhone 15 Pro", capacidade: "128GB", valorBase: 4200.0 },
    { modelo: "iPhone 15 Pro", capacidade: "256GB", valorBase: 4400.0 },
    { modelo: "iPhone 15 Pro", capacidade: "512GB", valorBase: 4700.0 },
    { modelo: "iPhone 15 Pro", capacidade: "1TB", valorBase: 5100.0 },
    { modelo: "iPhone 15 Pro Max", capacidade: "256GB", valorBase: 4600.0 },
    { modelo: "iPhone 15 Pro Max", capacidade: "512GB", valorBase: 4900.0 },
    { modelo: "iPhone 15 Pro Max", capacidade: "1TB", valorBase: 5300.0 },

    // iPhone 16 Series
    { modelo: "iPhone 16", capacidade: "128GB", valorBase: 4000.0 },
    { modelo: "iPhone 16", capacidade: "256GB", valorBase: 4200.0 },
    { modelo: "iPhone 16", capacidade: "512GB", valorBase: 4500.0 },
    { modelo: "iPhone 16 Plus", capacidade: "128GB", valorBase: 4200.0 },
    { modelo: "iPhone 16 Plus", capacidade: "256GB", valorBase: 4400.0 },
    { modelo: "iPhone 16 Plus", capacidade: "512GB", valorBase: 4700.0 },
    { modelo: "iPhone 16 Pro", capacidade: "128GB", valorBase: 4600.0 },
    { modelo: "iPhone 16 Pro", capacidade: "256GB", valorBase: 4800.0 },
    { modelo: "iPhone 16 Pro", capacidade: "512GB", valorBase: 5100.0 },
    { modelo: "iPhone 16 Pro", capacidade: "1TB", valorBase: 5500.0 },
    { modelo: "iPhone 16 Pro Max", capacidade: "256GB", valorBase: 5000.0 },
    { modelo: "iPhone 16 Pro Max", capacidade: "512GB", valorBase: 5300.0 },
    { modelo: "iPhone 16 Pro Max", capacidade: "1TB", valorBase: 5700.0 },

   
];

// ============================================================
// TABELA 2: Products — iPhones Novos (para o Step 7 do funil)
// ============================================================
// O funil precisa de produtos na tabela Product com category "iPhones Novos"
// para mostrar no DesiredModelStep. Estes são os iPhones que a CompreFi vende.
// IMPORTANTE: Você deve substituir esses valores pelos preços reais do seu catálogo.

const produtosNovos = [
  {
    model: "iPhone 16 Pro Max 256GB",
    storage: "256GB",
    color: "Titânio Natural, Titânio Preto, Titânio Branco, Titânio Deserto",
    battery: "100%",
    originalPrice: "R$ 10.499,00",
    installmentPrice: "12x R$ 799,00",
    pixPrice: "R$ 8.999,00",
    details: "Lacrado com nota fiscal | Garantia Apple 1 ano",
    category: "iPhones Novos",
    specs: "Chip A18 Pro | Tela 6.9\" Super Retina XDR | Câmera 48MP",
    isNew: true,
    isActive: true,
  },
  {
    model: "iPhone 16 Pro Max 512GB",
    storage: "512GB",
    color: "Titânio Natural, Titânio Preto, Titânio Branco, Titânio Deserto",
    battery: "100%",
    originalPrice: "R$ 12.499,00",
    installmentPrice: "12x R$ 949,00",
    pixPrice: "R$ 10.499,00",
    details: "Lacrado com nota fiscal | Garantia Apple 1 ano",
    category: "iPhones Novos",
    specs: "Chip A18 Pro | Tela 6.9\" Super Retina XDR | Câmera 48MP",
    isNew: true,
    isActive: true,
  },
  {
    model: "iPhone 16 Pro Max 1TB",
    storage: "1TB",
    color: "Titânio Natural, Titânio Preto, Titânio Branco, Titânio Deserto",
    battery: "100%",
    originalPrice: "R$ 14.499,00",
    installmentPrice: "12x R$ 1.099,00",
    pixPrice: "R$ 12.499,00",
    details: "Lacrado com nota fiscal | Garantia Apple 1 ano",
    category: "iPhones Novos",
    specs: "Chip A18 Pro | Tela 6.9\" Super Retina XDR | Câmera 48MP",
    isNew: true,
    isActive: true,
  },
  {
    model: "iPhone 16 Pro 128GB",
    storage: "128GB",
    color: "Titânio Natural, Titânio Preto, Titânio Branco, Titânio Deserto",
    battery: "100%",
    originalPrice: "R$ 8.499,00",
    installmentPrice: "12x R$ 649,00",
    pixPrice: "R$ 7.299,00",
    details: "Lacrado com nota fiscal | Garantia Apple 1 ano",
    category: "iPhones Novos",
    specs: "Chip A18 Pro | Tela 6.3\" Super Retina XDR | Câmera 48MP",
    isNew: true,
    isActive: true,
  },
  {
    model: "iPhone 16 Pro 256GB",
    storage: "256GB",
    color: "Titânio Natural, Titânio Preto, Titânio Branco, Titânio Deserto",
    battery: "100%",
    originalPrice: "R$ 9.499,00",
    installmentPrice: "12x R$ 724,00",
    pixPrice: "R$ 8.199,00",
    details: "Lacrado com nota fiscal | Garantia Apple 1 ano",
    category: "iPhones Novos",
    specs: "Chip A18 Pro | Tela 6.3\" Super Retina XDR | Câmera 48MP",
    isNew: true,
    isActive: true,
  },
  {
    model: "iPhone 16 256GB",
    storage: "256GB",
    color: "Ultramarino, Verde-azulado, Rosa, Branco, Preto",
    battery: "100%",
    originalPrice: "R$ 7.299,00",
    installmentPrice: "12x R$ 558,00",
    pixPrice: "R$ 6.299,00",
    details: "Lacrado com nota fiscal | Garantia Apple 1 ano",
    category: "iPhones Novos",
    specs: "Chip A18 | Tela 6.1\" Super Retina XDR | Câmera 48MP",
    isNew: true,
    isActive: true,
  },
  {
    model: "iPhone 16 128GB",
    storage: "128GB",
    color: "Ultramarino, Verde-azulado, Rosa, Branco, Preto",
    battery: "100%",
    originalPrice: "R$ 6.499,00",
    installmentPrice: "12x R$ 499,00",
    pixPrice: "R$ 5.699,00",
    details: "Lacrado com nota fiscal | Garantia Apple 1 ano",
    category: "iPhones Novos",
    specs: "Chip A18 | Tela 6.1\" Super Retina XDR | Câmera 48MP",
    isNew: true,
    isActive: true,
  },
  {
    model: "iPhone 15 Pro Max 256GB",
    storage: "256GB",
    color: "Titânio Natural, Titânio Azul, Titânio Branco, Titânio Preto",
    battery: "100%",
    originalPrice: "R$ 9.499,00",
    installmentPrice: "12x R$ 724,00",
    pixPrice: "R$ 7.999,00",
    details: "Lacrado com nota fiscal | Garantia Apple 1 ano",
    category: "iPhones Novos",
    specs: "Chip A17 Pro | Tela 6.7\" Super Retina XDR | Câmera 48MP",
    isNew: true,
    isActive: true,
  },
  {
    model: "iPhone 15 128GB",
    storage: "128GB",
    color: "Rosa, Amarelo, Verde, Azul, Preto",
    battery: "100%",
    originalPrice: "R$ 5.999,00",
    installmentPrice: "12x R$ 458,00",
    pixPrice: "R$ 4.999,00",
    details: "Lacrado com nota fiscal | Garantia Apple 1 ano",
    category: "iPhones Novos",
    specs: "Chip A16 Bionic | Tela 6.1\" Super Retina XDR | Câmera 48MP",
    isNew: true,
    isActive: true,
  },
];

async function main() {
  console.log("🚀 Iniciando seed das tabelas de troca...\n");

  // ---- Criar usuário admin (necessário para Product) ----
  let adminUser = await prisma.user.findFirst({
    where: { email: "admin@comprefi.com" },
  });

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        name: "Admin CompreFi",
        email: "admin@comprefi.com",
        password: "$2b$10$placeholder_hash_for_seed", // placeholder
      },
    });
    console.log("👤 Usuário admin criado");
  }

  // ---- Popular ValorTroca ----
  console.log("\n📊 Populando tabela ValorTroca...");
  let created = 0;
  let skipped = 0;

  for (const valor of valoresTroca) {
    try {
      await prisma.valorTroca.upsert({
        where: {
          modelo_capacidade: {
            modelo: valor.modelo,
            capacidade: valor.capacidade,
          },
        },
        update: {
          valorBase: valor.valorBase,
          ativo: true,
        },
        create: {
          modelo: valor.modelo,
          capacidade: valor.capacidade,
          valorBase: valor.valorBase,
          ativo: true,
        },
      });
      created++;
    } catch (err) {
      console.error(`   ❌ Erro em ${valor.modelo} ${valor.capacidade}:`, err);
      skipped++;
    }
  }
  console.log(`   ✅ ${created} valores inseridos/atualizados, ${skipped} erros`);

  // ---- Popular Products (iPhones Novos) ----
  console.log("\n📱 Populando tabela Product (iPhones Novos)...");
  let prodCreated = 0;

  for (const produto of produtosNovos) {
    try {
      // Verificar se já existe um produto com esse modelo
      const existing = await prisma.product.findFirst({
        where: { model: produto.model },
      });

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: { ...produto, userId: adminUser.id },
        });
        console.log(`   🔄 Atualizado: ${produto.model}`);
      } else {
        await prisma.product.create({
          data: {
            ...produto,
            image: "",
            realImages: [],
            userId: adminUser.id,
          },
        });
        console.log(`   ✅ Criado: ${produto.model}`);
      }
      prodCreated++;
    } catch (err) {
      console.error(`   ❌ Erro em ${produto.model}:`, err);
    }
  }
  console.log(`   ✅ ${prodCreated} produtos inseridos/atualizados`);

  // ---- Resumo ----
  const totalValores = await prisma.valorTroca.count();
  const totalProdutos = await prisma.product.count({
    where: { category: "iPhones Novos" },
  });

  console.log("\n" + "=".repeat(50));
  console.log("📋 RESUMO:");
  console.log(`   ValorTroca: ${totalValores} registros`);
  console.log(`   Products (iPhones Novos): ${totalProdutos} registros`);
  console.log("=".repeat(50));
  console.log("\n✅ Seed concluído! O funil de troca está pronto para testar.");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
