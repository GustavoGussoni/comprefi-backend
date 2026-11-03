import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { CatalogCrmSkuService } from "./catalog-crm-sku.service";
import {
  normalizeCrmSku,
  parseUpdateCatalogCrmSkuBody,
} from "./catalog-crm-sku.contract";

describe("CatalogCrmSkuService", () => {
  const findUnique = jest.fn();
  const updateMany = jest.fn();
  const service = new CatalogCrmSkuService({
    productVariant: { findUnique, updateMany },
  } as unknown as PrismaService);
  beforeEach(() => {
    jest.resetAllMocks();
    findUnique.mockResolvedValue({
      id: "variant-1",
      crmSku: "Old",
      crmSkuRevision: 7,
    });
    updateMany.mockResolvedValue({ count: 1 });
  });

  it("normalizes trim only and accepts max ASCII length/null", () => {
    expect(normalizeCrmSku("  AbC.1_-  ")).toBe("AbC.1_-");
    expect(normalizeCrmSku("A".repeat(160))).toHaveLength(160);
    expect(normalizeCrmSku(null)).toBeNull();
  });

  it.each([
    "",
    " ",
    "A".repeat(161),
    ".abc",
    "-abc",
    "_abc",
    "ação",
    "a b",
    "a/b",
    "a\nb",
    123,
    undefined,
    {},
    [],
  ])("rejects invalid SKU %p", (value) => {
    expect(() => normalizeCrmSku(value)).toThrow(BadRequestException);
  });

  it.each([
    null,
    [],
    {},
    { crmSku: null },
    { expectedRevision: 0 },
    { crmSku: null, expectedRevision: -1 },
    { crmSku: null, expectedRevision: 0.5 },
    { crmSku: null, expectedRevision: "0" },
    { crmSku: null, expectedRevision: NaN },
    { crmSku: null, expectedRevision: Infinity },
    { crmSku: null, expectedRevision: 0, crmProductId: "injected" },
    { crmSku: null, expectedRevision: 0, pixPrice: "0" },
  ])("rejects non-strict body %p", (body) => {
    expect(() => parseUpdateCatalogCrmSkuBody(body)).toThrow(
      BadRequestException,
    );
  });

  it("writes only CRM fields through compare-and-set and does not expose ID", async () => {
    expect(
      await service.update("variant-1", {
        crmSku: "  NewSKU  ",
        expectedRevision: 7,
      }),
    ).toEqual({
      id: "variant-1",
      crmSku: "NewSKU",
      crmSkuRevision: 8,
      crmMappingStatus: "configured",
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "variant-1", crmSkuRevision: 7 },
      data: {
        crmSku: "NewSKU",
        crmProductId: null,
        crmSkuRevision: { increment: 1 },
      },
    });
  });

  it("clears SKU/ID and projects pending", async () => {
    expect(
      await service.update("variant-1", { crmSku: null, expectedRevision: 7 }),
    ).toEqual({
      id: "variant-1",
      crmSku: null,
      crmSkuRevision: 8,
      crmMappingStatus: "pending",
    });
    expect(updateMany.mock.calls[0][0].data.crmProductId).toBeNull();
  });

  it("same SKU is no-op and preserves imported ID and revision", async () => {
    expect(
      await service.update("variant-1", {
        crmSku: " Old ",
        expectedRevision: 7,
      }),
    ).toEqual({
      id: "variant-1",
      crmSku: "Old",
      crmSkuRevision: 7,
      crmMappingStatus: "configured",
    });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("same null is no-op", async () => {
    findUnique.mockResolvedValue({
      id: "variant-1",
      crmSku: null,
      crmSkuRevision: 0,
    });
    expect(
      (await service.update("variant-1", { crmSku: null, expectedRevision: 0 }))
        .crmSkuRevision,
    ).toBe(0);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("rejects stale revision even if SKU is equal", async () => {
    await expect(
      service.update("variant-1", { crmSku: "Old", expectedRevision: 6 }),
    ).rejects.toThrow(ConflictException);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("rejects concurrent lost compare-and-set", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.update("variant-1", { crmSku: "New", expectedRevision: 7 }),
    ).rejects.toThrow(ConflictException);
  });

  it("reports unique SKU as readable 409", async () => {
    updateMany.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "6",
        meta: { target: ["crmSku"] },
      }),
    );
    await expect(
      service.update("variant-1", { crmSku: "New", expectedRevision: 7 }),
    ).rejects.toThrow("já está associado");
  });

  it("does not mask unexpected storage failures", async () => {
    updateMany.mockRejectedValue(new Error("storage unavailable"));
    await expect(
      service.update("variant-1", { crmSku: "New", expectedRevision: 7 }),
    ).rejects.toThrow("storage unavailable");
  });

  it("returns 404 for missing variant", async () => {
    findUnique.mockResolvedValue(null);
    await expect(
      service.update("missing", { crmSku: null, expectedRevision: 0 }),
    ).rejects.toThrow(NotFoundException);
  });
});
