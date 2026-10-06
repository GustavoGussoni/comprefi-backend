import {
Controller,
Get,
Post,
Put,
Delete,
Body,
Param,
Query,
UseGuards,
HttpException,
HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { PrismaService } from "../../database/prisma.service";

@ApiTags("Catalog")
@Controller("catalog")
export class CatalogController {
constructor(private readonly prisma: PrismaService) {}

// ============================================
// Endpoints Públicos
// ============================================

@Get("categories")
@ApiOperation({ summary: "Listar todas as categorias com produtos ativos" })
async getCategories() {
  const groups = await this.prisma.productGroup.findMany({
    where: { isActive: true },
    select: { category: true },
    distinct: ["category"],
  });

  return groups.map((g) => g.category);
}

@Get("products/:category")
@ApiOperation({ summary: "Listar produtos de uma categoria com preços atualizados" })
async getProductsByCategory(@Param("category") category: string) {
  const groups = await this.prisma.productGroup.findMany({
    where: {
      category,
      isActive: true,
    },
    include: {
      variants: {
        where: { isActive: true },
        orderBy: [{ storage: "asc" }, { color: "asc" }],
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  // Retorna no formato que o frontend espera para sobrescrever preços
  return groups.map((group) => ({
    slug: group.slug,
    model: group.model,
    category: group.category,
    section: group.section,
    isActive: group.isActive,
    storages: group.storages,
    pricing: this.buildPricingMap(group.variants),
    activeVariants: group.variants.map((v) => ({
      storage: v.storage,
      color: v.color,
      isActive: v.isActive,
    })),
  }));
}

@Get("products/:category/:slug")
@ApiOperation({ summary: "Buscar um produto específico por slug" })
async getProductBySlug(
  @Param("category") category: string,
  @Param("slug") slug: string
) {
  const group = await this.prisma.productGroup.findFirst({
    where: { slug, category, isActive: true },
    include: {
      variants: {
        where: { isActive: true },
        orderBy: [{ storage: "asc" }, { color: "asc" }],
      },
    },
  });

  if (!group) {
    throw new HttpException("Produto não encontrado", HttpStatus.NOT_FOUND);
  }

  return {
    slug: group.slug,
    model: group.model,
    category: group.category,
    section: group.section,
    specs: group.specs,
    details: group.details,
    battery: group.battery,
    storages: group.storages,
    isActive: group.isActive,
    pricing: this.buildPricingMap(group.variants),
  };
}

@Get("products-flat")
@ApiOperation({ summary: "Listar todos os produtos ativos no formato flat (para funil de troca)" })
async getProductsFlat() {
  const groups = await this.prisma.productGroup.findMany({
    where: { isActive: true },
    include: {
      variants: {
        where: { isActive: true },
        orderBy: [{ storage: "asc" }, { color: "asc" }],
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  // Transforma ProductGroup + Variants no formato flat que o DesiredModelStep espera
  const flatProducts: any[] = [];
  for (const group of groups) {
    for (const variant of group.variants) {
      flatProducts.push({
        id: variant.id,
        model: group.model,
        storage: variant.storage,
        color: variant.color,
        battery: group.battery || "",
        originalPrice: variant.originalPrice,
        installmentPrice: variant.installmentPrice,
        pixPrice: variant.pixPrice,
        details: group.details || "",
        image: "",
        realImages: [],
        category: this.categoryToLabel(group.category),
        specs: group.specs || "",
        isNew: false,
        isActive: variant.isActive,
      });
    }
  }

  return flatProducts;
}

// ============================================
// Endpoints Admin (protegidos)
// ============================================

@Get("admin/products")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: "Listar todos os produtos (admin)" })
async getAllProductsAdmin(
  @Query("category") category?: string,
  @Query("includeInactive") includeInactive?: string
) {
  const where: any = {};
  if (category) where.category = category;
  if (includeInactive !== "true") where.isActive = true;

  const groups = await this.prisma.productGroup.findMany({
    where,
    include: {
      variants: {
        orderBy: [{ storage: "asc" }, { color: "asc" }],
      },
    },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  return groups.map((group) => ({
    id: group.id,
    slug: group.slug,
    model: group.model,
    category: group.category,
    section: group.section,
    specs: group.specs,
    details: group.details,
    battery: group.battery,
    storages: group.storages,
    isActive: group.isActive,
    sortOrder: group.sortOrder,
    variantCount: group.variants.length,
    variants: group.variants.map((v) => ({
      id: v.id,
      storage: v.storage,
      color: v.color,
      originalPrice: v.originalPrice,
      installmentPrice: v.installmentPrice,
      pixPrice: v.pixPrice,
      isActive: v.isActive,
    })),
  }));
}

@Put("admin/products/:slug/variants")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
@ApiOperation({ summary: "Atualizar preços de variantes em lote" })
async updateVariants(
  @Param("slug") slug: string,
  @Body()
  body: {
    variants: {
      storage: string;
      color: string;
      originalPrice?: string;
      installmentPrice?: string;
      pixPrice?: string;
      isActive?: boolean;
    }[];
  }
) {
  const group = await this.prisma.productGroup.findUnique({
    where: { slug },
  });

  if (!group) {
    throw new HttpException("Produto não encontrado", HttpStatus.NOT_FOUND);
  }

  const results = [];

  for (const variant of body.variants) {
    const result = await this.prisma.productVariant.upsert({
      where: {
        productGroupId_storage_color: {
          productGroupId: group.id,
          storage: variant.storage,
          color: variant.color,
        },
      },
      update: {
        ...(variant.originalPrice && { originalPrice: variant.originalPrice }),
        ...(variant.installmentPrice && { installmentPrice: variant.installmentPrice }),
        ...(variant.pixPrice && { pixPrice: variant.pixPrice }),
        ...(variant.isActive !== undefined && { isActive: variant.isActive }),
      },
      create: {
        productGroupId: group.id,
        storage: variant.storage,
        color: variant.color,
        originalPrice: variant.originalPrice || "R$ 0",
        installmentPrice: variant.installmentPrice || "R$ 0",
        pixPrice: variant.pixPrice || "R$ 0",
        isActive: variant.isActive ?? true,
      },
    });

    results.push(result);
  }

  return { updated: results.length, variants: results };
}

@Put("admin/products/:slug")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
@ApiOperation({ summary: "Atualizar dados de um produto" })
async updateProduct(
  @Param("slug") slug: string,
  @Body()
  body: {
    model?: string;
    section?: string;
    specs?: string;
    details?: string;
    battery?: string;
    storages?: string[];
    isActive?: boolean;
    sortOrder?: number;
  }
) {
  const group = await this.prisma.productGroup.findUnique({
    where: { slug },
  });

  if (!group) {
    throw new HttpException("Produto não encontrado", HttpStatus.NOT_FOUND);
  }

  const updated = await this.prisma.productGroup.update({
    where: { slug },
    data: {
      ...(body.model && { model: body.model }),
      ...(body.section !== undefined && { section: body.section }),
      ...(body.specs !== undefined && { specs: body.specs }),
      ...(body.details !== undefined && { details: body.details }),
      ...(body.battery !== undefined && { battery: body.battery }),
      ...(body.storages && { storages: body.storages }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
    },
  });

  return updated;
}

@Post("admin/products")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
@ApiOperation({ summary: "Criar um novo produto" })
async createProduct(
  @Body()
  body: {
    slug: string;
    model: string;
    category: string;
    section?: string;
    specs?: string;
    details?: string;
    battery?: string;
    storages: string[];
    sortOrder?: number;
    variants?: {
      storage: string;
      color: string;
      originalPrice: string;
      installmentPrice: string;
      pixPrice: string;
    }[];
  }
) {
  const existing = await this.prisma.productGroup.findUnique({
    where: { slug: body.slug },
  });

  if (existing) {
    throw new HttpException("Slug já existe", HttpStatus.CONFLICT);
  }

  const group = await this.prisma.productGroup.create({
    data: {
      slug: body.slug,
      model: body.model,
      category: body.category,
      section: body.section,
      specs: body.specs,
      details: body.details,
      battery: body.battery,
      storages: body.storages,
      sortOrder: body.sortOrder || 0,
      variants: body.variants
        ? {
            create: body.variants.map((v) => ({
              storage: v.storage,
              color: v.color,
              originalPrice: v.originalPrice,
              installmentPrice: v.installmentPrice,
              pixPrice: v.pixPrice,
            })),
          }
        : undefined,
    },
    include: { variants: true },
  });

  return group;
}

@Delete("admin/products/:slug")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
@ApiOperation({ summary: "Desativar um produto (soft delete)" })
async deactivateProduct(@Param("slug") slug: string) {
  const group = await this.prisma.productGroup.findUnique({
    where: { slug },
  });

  if (!group) {
    throw new HttpException("Produto não encontrado", HttpStatus.NOT_FOUND);
  }

  await this.prisma.productGroup.update({
    where: { slug },
    data: { isActive: false },
  });

  return { message: `Produto ${slug} desativado` };
}

@Get("admin/stats")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: "Estatísticas do catálogo" })
async getCatalogStats() {
  const [totalGroups, activeGroups, totalVariants, activeVariants] =
    await Promise.all([
      this.prisma.productGroup.count(),
      this.prisma.productGroup.count({ where: { isActive: true } }),
      this.prisma.productVariant.count(),
      this.prisma.productVariant.count({ where: { isActive: true } }),
    ]);

  const byCategory = await this.prisma.productGroup.groupBy({
    by: ["category"],
    _count: { id: true },
    where: { isActive: true },
  });

  return {
    totalGroups,
    activeGroups,
    totalVariants,
    activeVariants,
    byCategory: byCategory.map((c) => ({
      category: c.category,
      count: c._count.id,
    })),
  };
}

// ============================================
// Helpers
// ============================================



private buildPricingMap(
  variants: {
    storage: string;
    color: string;
    originalPrice: string;
    installmentPrice: string;
    pixPrice: string;
  }[]
): Record<string, { originalPrice: string; installmentPrice: string; pixPrice: string }> {
  const map: Record<string, any> = {};
  for (const v of variants) {
    const key = `${v.storage}-${v.color}`;
    map[key] = {
      originalPrice: v.originalPrice,
      installmentPrice: v.installmentPrice,
      pixPrice: v.pixPrice,
    };
  }
  return map;
}

private categoryToLabel(slug: string): string {
    const labels: Record<string, string> = {
      "iphones-novos": "iPhones Novos",
      "iphones-seminovos": "iPhones Seminovos",
      "macbooks": "MacBooks",
      "ipads": "iPads",
      "apple-watch": "Apple Watch",
      "acessorios": "Acessórios",
    };
    return labels[slug] || slug;
  }
}
