import "reflect-metadata";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { ROLES_KEY } from "../auth/roles.decorator";
import { CatalogController } from "./catalog.controller";
import { CatalogCrmSkuService } from "./catalog-crm-sku.service";
import { CATALOG_ADMIN_VARIANT_SELECT } from "./catalog-crm-sku.contract";
import { CurrentCatalogCrmAdminGuard } from "./current-catalog-crm-admin.guard";

describe("CatalogController CRM SKU", () => {
  const variant = {
    id: "variant-1",
    storage: "256GB",
    color: "Prata",
    originalPrice: "R$ 10",
    installmentPrice: "R$ 1",
    pixPrice: "R$ 9",
    isActive: true,
    crmSku: "CaseSKU",
    crmProductId: "internal-never-browser",
    crmSkuRevision: 2,
  };
  const group = {
    id: "group-1",
    slug: "model",
    model: "Model",
    category: "iphones-novos",
    storages: ["256GB"],
    isActive: true,
    variants: [variant],
  };
  const findMany = jest.fn();
  const findUnique = jest.fn();
  const findFirst = jest.fn();
  const create = jest.fn();
  const update = jest.fn();
  const upsert = jest.fn();
  const updateSku = jest.fn();
  const controller = new CatalogController(
    {
      productGroup: { findMany, findUnique, findFirst, create, update },
      productVariant: { upsert },
    } as unknown as PrismaService,
    { update: updateSku } as unknown as CatalogCrmSkuService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    findMany.mockResolvedValue([group]);
    findUnique.mockResolvedValue(group);
    findFirst.mockResolvedValue(group);
    create.mockResolvedValue(group);
    upsert.mockResolvedValue({ id: variant.id });
    update.mockResolvedValue({ id: group.id });
  });

  it("dedicated route has real JWT and ADMIN role guard metadata", () => {
    const handler = CatalogController.prototype.updateVariantCrmSku;
    expect(Reflect.getMetadata("path", handler)).toBe(
      "admin/variants/:id/crm-sku",
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
      JwtAuthGuard,
      RolesGuard,
      CurrentCatalogCrmAdminGuard,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([UserRole.ADMIN]);
    const get = CatalogController.prototype.getAllProductsAdmin;
    expect(Reflect.getMetadata(GUARDS_METADATA, get)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, get)).toEqual([
      UserRole.ADMIN,
      UserRole.SALES,
    ]);
  });

  it("delegates body untouched to strict service", async () => {
    const body = { crmSku: "New", expectedRevision: 2 };
    updateSku.mockResolvedValue({ id: variant.id });
    expect(await controller.updateVariantCrmSku(variant.id, body)).toEqual({
      id: variant.id,
    });
    expect(updateSku).toHaveBeenCalledWith(variant.id, body);
  });

  it("admin lists CRM fields but not internal ID for ALL categories including used", async () => {
    findMany.mockResolvedValue([
      group,
      {
        ...group,
        category: "iphones-seminovos",
        variants: [{ ...variant, crmSku: null }],
      },
    ]);
    const result = await controller.getAllProductsAdmin(undefined, "true");
    expect(result[0].variants[0]).toMatchObject({
      id: variant.id,
      crmSku: "CaseSKU",
      crmSkuRevision: 2,
      crmMappingStatus: "configured",
    });
    expect(result[1].variants[0]).toMatchObject({
      crmSku: null,
      crmMappingStatus: "pending",
    });
    expect(JSON.stringify(result)).not.toContain("crmProductId");
    expect(findMany.mock.calls[0][0].include.variants.select).toEqual(
      CATALOG_ADMIN_VARIANT_SELECT,
    );
  });

  it("public category, detail and funnel responses never expose CRM fields", async () => {
    const responses = await Promise.all([
      controller.getProductsByCategory("iphones-novos"),
      controller.getProductBySlug("iphones-novos", "model"),
      controller.getProductsFlat(),
    ]);
    expect(JSON.stringify(responses)).not.toMatch(
      /crmSku|crmProductId|crmSkuRevision|crmMappingStatus/,
    );
  });

  it("generic variant update ignores injected CRM fields and preserves price whitelist", async () => {
    const injected = {
      variants: [
        {
          ...variant,
          crmSku: "injected",
          crmSkuRevision: 999,
          crmProductId: "injected",
        },
      ],
    };
    await controller.updateVariants("model", injected);
    const args = upsert.mock.calls[0][0];
    for (const data of [args.update, args.create]) {
      expect(data).not.toHaveProperty("crmSku");
      expect(data).not.toHaveProperty("crmSkuRevision");
      expect(data).not.toHaveProperty("crmProductId");
      expect(data.pixPrice).toBe("R$ 9");
    }
    expect(args.select).toEqual(CATALOG_ADMIN_VARIANT_SELECT);
  });

  it("generic create ignores nested and top-level CRM injection", async () => {
    findUnique.mockResolvedValue(null);
    await controller.createProduct({
      ...group,
      variants: [variant],
      crmSku: "injected",
      crmProductId: "injected",
    } as Parameters<CatalogController["createProduct"]>[0]);
    const args = create.mock.calls[0][0];
    for (const data of [args.data, args.data.variants.create[0]]) {
      expect(data).not.toHaveProperty("crmSku");
      expect(data).not.toHaveProperty("crmSkuRevision");
      expect(data).not.toHaveProperty("crmProductId");
    }
    expect(args.include.variants.select).toEqual(CATALOG_ADMIN_VARIANT_SELECT);
  });

  it("generic group update ignores CRM injection", async () => {
    await controller.updateProduct("model", {
      model: "Kept",
      crmSku: "injected",
      crmSkuRevision: 999,
      crmProductId: "injected",
    } as Parameters<CatalogController["updateProduct"]>[1]);
    expect(update.mock.calls[0][0].data).toEqual({ model: "Kept" });
  });
});
