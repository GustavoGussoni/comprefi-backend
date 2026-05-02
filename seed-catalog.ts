/**
 * Seed script para popular ProductGroup e ProductVariant
 * a partir dos dados extraídos do frontend.
 *
 * Uso:
 *   npx tsx seed-catalog.ts
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface ProductData {
  slug: string;
  model: string;
  category: string;
  section: string | null;
  specs: string;
  details: string;
  battery: string;
  storages: string[];
  colors: { name: string; hex: string }[];
  pricing: Record<
    string,
    {
      originalPrice: string;
      installmentPrice: string;
      pixPrice: string;
    }
  >;
}

async function main() {
  // Ler o JSON com os dados dos produtos
  const dataPath = path.join(__dirname, "products-data.json");

  if (!fs.existsSync(dataPath)) {
    console.error("Arquivo products-data.json não encontrado!");
    console.error("Coloque o arquivo na mesma pasta deste script.");
    process.exit(1);
  }

  const products: ProductData[] = JSON.parse(
    fs.readFileSync(dataPath, "utf-8")
  );

  console.log(`\nCarregados ${products.length} produtos do JSON\n`);

  let groupsCreated = 0;
  let variantsCreated = 0;
  let sortOrder = 0;

  for (const product of products) {
    sortOrder++;

    // Upsert do ProductGroup
    const group = await prisma.productGroup.upsert({
      where: { slug: product.slug },
      update: {
        model: product.model,
        category: product.category,
        section: product.section,
        specs: product.specs || null,
        details: product.details || null,
        battery: product.battery || null,
        storages: product.storages,
        sortOrder,
      },
      create: {
        slug: product.slug,
        model: product.model,
        category: product.category,
        section: product.section,
        specs: product.specs || null,
        details: product.details || null,
        battery: product.battery || null,
        storages: product.storages,
        isActive: true,
        sortOrder,
      },
    });

    groupsCreated++;

    // Criar variantes a partir do pricing map
    for (const [key, prices] of Object.entries(product.pricing)) {
      // O key é "storage-color" ou "storage" (para produtos sem variação de cor)
      const parts = key.split("-");
      let storage: string;
      let color: string;

      if (parts.length >= 2) {
        storage = parts[0];
        color = parts.slice(1).join("-"); // Para cores com hífen como "Space Black"
      } else {
        storage = parts[0];
        color = product.colors.length > 0 ? product.colors[0].name : "Padrão";
      }

      await prisma.productVariant.upsert({
        where: {
          productGroupId_storage_color: {
            productGroupId: group.id,
            storage,
            color,
          },
        },
        update: {
          originalPrice: prices.originalPrice,
          installmentPrice: prices.installmentPrice,
          pixPrice: prices.pixPrice,
          isActive: true,
        },
        create: {
          productGroupId: group.id,
          storage,
          color,
          originalPrice: prices.originalPrice,
          installmentPrice: prices.installmentPrice,
          pixPrice: prices.pixPrice,
          isActive: true,
        },
      });

      variantsCreated++;
    }

    console.log(
      `  ✓ ${product.slug} (${product.category}${product.section ? " / " + product.section : ""}) — ${Object.keys(product.pricing).length} variantes`
    );
  }

  console.log(`\n========================================`);
  console.log(`  ${groupsCreated} ProductGroups criados/atualizados`);
  console.log(`  ${variantsCreated} ProductVariants criados/atualizados`);
  console.log(`========================================\n`);
}

main()
  .catch((e) => {
    console.error("Erro:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
