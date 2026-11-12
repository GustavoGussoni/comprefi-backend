import { HttpException, HttpStatus } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { CatalogController } from "./catalog.controller";
import { CatalogCrmSkuService } from "./catalog-crm-sku.service";

const valid = { id: "test-variant", storage: "256GB", color: "Star White", originalPrice: "R$ 12.300,00", installmentPrice: "R$ 999,00", pixPrice: "R$ 10.000,00", isActive: true, crmSku: "TEST-SKU", crmProductId: "private-test-only", crmSkuRevision: 4 };
const group = { id: "test-group", slug: "iphone-duo", model: "iPhone Duo", category: "iphones-novos", storages: ["256GB"], isActive: true, variants: [valid] };

describe("CatalogController public pricing gate", () => {
  const findMany = jest.fn(); const findFirst = jest.fn();
  const controller = new CatalogController({ productGroup: { findMany, findFirst } } as unknown as PrismaService, {} as CatalogCrmSkuService);
  beforeEach(() => { jest.resetAllMocks(); findMany.mockResolvedValue([group]); findFirst.mockResolvedValue(group); });

  it("preserves positive existing offers and never exposes CRM fields", async () => {
    const category = await controller.getProductsByCategory("iphones-novos");
    const detail = await controller.getProductBySlug("iphones-novos", "iphone-duo");
    const flat = await controller.getProductsFlat();
    expect(category[0].pricing["256GB-Star White"]).toEqual({ originalPrice: valid.originalPrice, installmentPrice: valid.installmentPrice, pixPrice: valid.pixPrice });
    expect(detail.pricing).toEqual(category[0].pricing); expect(flat).toHaveLength(1);
    expect(JSON.stringify([category, detail, flat])).not.toMatch(/crmSku|crmProductId|crmSkuRevision/);
  });

  it.each(["", " ", "R$ 0", "R$ 0,00", "R$ -1,00", "NaN", "Infinity", "R$ abc", "10.00", "R$ 1,2,3", "1e3"])("omits invalid PIX %s from category, detail and funnel", async (price) => {
    const invalidGroup = { ...group, variants: [{ ...valid, pixPrice: price }] };
    findMany.mockResolvedValue([invalidGroup]); findFirst.mockResolvedValue(invalidGroup);
    expect(await controller.getProductsByCategory("iphones-novos")).toEqual([]);
    expect(await controller.getProductsFlat()).toEqual([]);
    await expect(controller.getProductBySlug("iphones-novos", "iphone-duo")).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
  });

  it.each(["originalPrice", "installmentPrice"])("requires positive %s as well", async (field) => {
    findMany.mockResolvedValue([{ ...group, variants: [{ ...valid, [field]: "" }] }]);
    expect(await controller.getProductsByCategory("iphones-novos")).toEqual([]); expect(await controller.getProductsFlat()).toEqual([]);
  });

  it("keeps only exact valid active combinations, preserving storage and color", async () => {
    const mixed = { ...group, variants: [valid, { ...valid, id: "zero", color: "Night Sky", pixPrice: "R$ 0" }, { ...valid, id: "inactive", storage: "512GB", isActive: false }] };
    findMany.mockResolvedValue([mixed]); findFirst.mockResolvedValue(mixed);
    const result = await controller.getProductsByCategory("iphones-novos");
    expect(result[0].activeVariants).toEqual([{ storage: "256GB", color: "Star White", isActive: true }]);
    expect(Object.keys(result[0].pricing)).toEqual(["256GB-Star White"]);
    expect(await controller.getProductsFlat()).toHaveLength(1);
  });

  it("admin still sees all pending variants and configured SKU untouched", async () => {
    findMany.mockResolvedValue([{ ...group, variants: [{ ...valid, pixPrice: "", originalPrice: "", installmentPrice: "", isActive: false }] }]);
    const result = await controller.getAllProductsAdmin(undefined, "true");
    expect(result[0].variants[0]).toMatchObject({ pixPrice: "", isActive: false, crmSku: "TEST-SKU", crmSkuRevision: 4 });
    expect(result[0].variantCount).toBe(1);
  });

  it("group with no active variants has no public offer", async () => {
    findMany.mockResolvedValue([{ ...group, variants: [] }]); findFirst.mockResolvedValue({ ...group, variants: [] });
    expect(await controller.getProductsByCategory("iphones-novos")).toEqual([]);
    await expect(controller.getProductBySlug("iphones-novos", "iphone-duo")).rejects.toBeInstanceOf(HttpException);
  });
});
