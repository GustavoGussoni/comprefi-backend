import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, UsedStockStatus } from "@prisma/client";
import { UsedStockService } from "./used-stock.service";

const actor = { id: "user-1" };
const date = new Date("2026-10-28T12:00:00.000Z");
const fixturePhoto = "/assets/test-fixtures/used-stock-fictional-photo-a.jpg";
const otherFixturePhoto = "/assets/test-fixtures/used-stock-fictional-photo-b.jpg";

function catalogVariant(overrides: Record<string, unknown> = {}) {
  return {
    id: "variant-seminovo-1",
    productGroupId: "group-seminovo-1",
    storage: "128GB",
    color: "Preto",
    originalPrice: "R$ 0",
    installmentPrice: "R$ 0",
    pixPrice: "R$ 0",
    isActive: true,
    createdAt: date,
    updatedAt: date,
    productGroup: {
      id: "group-seminovo-1",
      slug: "iphone-15-seminovo",
      model: "iPhone 15 (Seminovo)",
      category: "iphones-seminovos",
      isActive: true,
    },
    ...overrides,
  };
}

function unit(overrides: Record<string, unknown> = {}) {
  return {
    id: "unit-1",
    revision: 1,
    creationKey: "d0b9a9d1-1cd6-4ad0-9c7d-8026ea9be7c4",
    creationFingerprint: "fingerprint",
    catalogVariantId: "variant-seminovo-1",
    model: "snapshot legado",
    storage: "snapshot legado",
    color: "snapshot legado",
    battery: 91,
    details: "Sem detalhes.",
    image: fixturePhoto,
    imageIsIllustrative: false,
    realImages: [fixturePhoto],
    pixPrice: new Prisma.Decimal(2500),
    installments: 12,
    installmentPrice: new Prisma.Decimal(250),
    imei: "123456789012345",
    internalNotes: "privado",
    status: UsedStockStatus.draft,
    receivedAt: null,
    checkedAt: null,
    activatedAt: null,
    soldAt: null,
    createdAt: date,
    updatedAt: date,
    createdById: actor.id,
    catalogVariant: catalogVariant(),
    ...overrides,
  };
}

function withHistory(overrides: Record<string, unknown> = {}) {
  return {
    ...unit(overrides),
    history: [
      {
        id: "history-1",
        unitId: "unit-1",
        actorId: actor.id,
        action: "created",
        at: date,
        actor: { id: actor.id, name: "Operador atual" },
      },
    ],
  };
}

describe("UsedStockService", () => {
  let usedStockUnit: Record<string, jest.Mock>;
  let usedStockHistory: Record<string, jest.Mock>;
  let productVariant: Record<string, jest.Mock>;
  let prisma: {
    $transaction: jest.Mock;
    usedStockUnit: typeof usedStockUnit;
    usedStockHistory: typeof usedStockHistory;
    productVariant: typeof productVariant;
  };
  let service: UsedStockService;

  beforeEach(() => {
    usedStockUnit = {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    };
    usedStockHistory = { create: jest.fn() };
    productVariant = { findUnique: jest.fn(), findMany: jest.fn() };
    prisma = {
      $transaction: jest.fn(async (callback: (tx: typeof prisma) => unknown) => callback(prisma)),
      usedStockUnit,
      usedStockHistory,
      productVariant,
    };
    service = new UsedStockService(prisma as never);
  });

  it("expõe somente unidades publicáveis, com identidade derivada e sem PII", async () => {
    usedStockUnit.findMany.mockResolvedValue([
      unit({ status: UsedStockStatus.available }),
      unit({ id: "unit-inativa", status: UsedStockStatus.available, catalogVariant: catalogVariant({ isActive: false }) }),
    ]);

    await expect(service.listPublic()).resolves.toEqual([
      {
        id: "unit-1",
        model: "iPhone 15",
        storage: "128GB",
        color: "Preto",
        battery: 91,
        details: "Sem detalhes.",
        image: fixturePhoto,
        imageIsIllustrative: false,
        realImages: [fixturePhoto],
        pixPrice: 2500,
        installments: 12,
        installmentPrice: 250,
      },
    ]);
    expect(usedStockUnit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: UsedStockStatus.available,
          imageIsIllustrative: false,
          realImages: { isEmpty: false },
          catalogVariant: expect.any(Object),
        }),
      }),
    );
  });

  it("recusa detalhe público pendente/inativo, mesmo se um mock retornar a unidade", async () => {
    usedStockUnit.findFirst.mockResolvedValue(
      unit({ status: UsedStockStatus.available, catalogVariant: catalogVariant({ isActive: false }) }),
    );
    await expect(service.getPublic("unit-1")).rejects.toBeInstanceOf(NotFoundException);

    usedStockUnit.findFirst.mockResolvedValue(null);
    await expect(service.getPublic("unit-legado")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("cria draft somente pelo ID de variante, resolve snapshots no servidor e preserva preço unitário", async () => {
    usedStockUnit.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(withHistory());
    productVariant.findUnique.mockResolvedValue(catalogVariant());
    usedStockUnit.create.mockResolvedValue(unit());
    usedStockHistory.create.mockResolvedValue({});

    const result = await service.create(actor, {
      creationKey: "d0b9a9d1-1cd6-4ad0-9c7d-8026ea9be7c4",
      catalogVariantId: "variant-seminovo-1",
      pixPrice: 2500.5,
      installmentPrice: 250.25,
      imei: "123456789012345",
    });

    expect(result).toMatchObject({
      id: "unit-1",
      status: "draft",
      model: "iPhone 15",
      catalogVariantId: "variant-seminovo-1",
      catalogLinked: true,
      pixPrice: 2500,
    });
    expect(productVariant.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "variant-seminovo-1" } }),
    );
    expect(usedStockUnit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          catalogVariantId: "variant-seminovo-1",
          model: "iPhone 15",
          storage: "128GB",
          color: "Preto",
          status: UsedStockStatus.draft,
          pixPrice: expect.any(Prisma.Decimal),
          installmentPrice: expect.any(Prisma.Decimal),
          createdById: actor.id,
        }),
      }),
    );
    expect(usedStockHistory.create).toHaveBeenCalledWith({
      data: { unitId: "unit-1", actorId: actor.id, action: "created" },
    });
  });

  it("rejeita variante inexistente ou de outra categoria, sem criar unidade", async () => {
    usedStockUnit.findUnique.mockResolvedValue(null);
    productVariant.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(
      catalogVariant({ productGroup: { ...catalogVariant().productGroup, category: "iphones-novos" } }),
    );
    const create = (catalogVariantId: string) =>
      service.create(actor, {
        creationKey: "d0b9a9d1-1cd6-4ad0-9c7d-8026ea9be7c4",
        catalogVariantId,
      });

    await expect(create("missing")).rejects.toBeInstanceOf(BadRequestException);
    await expect(create("variant-new")).rejects.toBeInstanceOf(BadRequestException);
    expect(usedStockUnit.create).not.toHaveBeenCalled();
  });

  it("é idempotente para a mesma creationKey e conflita se o corpo divergir", async () => {
    let fingerprint: string | undefined;
    let keyLookups = 0;
    usedStockUnit.findUnique.mockImplementation(async (args: { where: Record<string, unknown> }) => {
      if ("createdById_creationKey" in args.where) {
        keyLookups += 1;
        return keyLookups === 1
          ? null
          : withHistory({ creationFingerprint: fingerprint, revision: 1 });
      }
      return withHistory({ creationFingerprint: fingerprint, revision: 1 });
    });
    productVariant.findUnique.mockResolvedValue(catalogVariant());
    usedStockUnit.create.mockImplementation(async (args: { data: { creationFingerprint: string } }) => {
      fingerprint = args.data.creationFingerprint;
      return unit();
    });
    usedStockHistory.create.mockResolvedValue({});
    const body = {
      creationKey: "d0b9a9d1-1cd6-4ad0-9c7d-8026ea9be7c4",
      catalogVariantId: "variant-seminovo-1",
    };

    const first = await service.create(actor, body);
    const repeated = await service.create(actor, body);
    expect(repeated).toEqual(first);
    expect(usedStockUnit.create).toHaveBeenCalledTimes(1);

    await expect(service.create(actor, { ...body, details: "outro corpo" })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("revisa draft legado ao vincular variante e atualiza seus snapshots no servidor", async () => {
    usedStockUnit.findUnique
      .mockResolvedValueOnce(unit({ catalogVariantId: null, catalogVariant: null, model: "iPhone antigo" }))
      .mockResolvedValueOnce(withHistory({ revision: 2 }));
    productVariant.findUnique.mockResolvedValue(catalogVariant({ storage: "256GB", color: "Azul" }));
    usedStockUnit.updateMany.mockResolvedValue({ count: 1 });
    usedStockHistory.create.mockResolvedValue({});

    await service.patch(actor, "unit-1", {
      expectedRevision: 1,
      catalogVariantId: "variant-seminovo-1",
    });
    expect(usedStockUnit.updateMany).toHaveBeenCalledWith({
      where: { id: "unit-1", revision: 1, status: UsedStockStatus.draft },
      data: expect.objectContaining({
        catalogVariantId: "variant-seminovo-1",
        model: "iPhone 15",
        storage: "256GB",
        color: "Azul",
        revision: { increment: 1 },
      }),
    });
  });

  it("preserva draft legado no admin como vínculo pendente e seus snapshots históricos", async () => {
    usedStockUnit.findMany.mockResolvedValue([
      withHistory({
        catalogVariantId: null,
        catalogVariant: null,
        model: "iPhone 14 histórico",
        storage: "128GB",
        color: "Roxo",
      }),
    ]);

    await expect(service.listAdmin()).resolves.toEqual([
      expect.objectContaining({
        id: "unit-1",
        model: "iPhone 14 histórico",
        storage: "128GB",
        color: "Roxo",
        catalogVariantId: null,
        catalogLinked: false,
        catalogActive: false,
        imei: "123456789012345",
        pixPrice: 2500,
        history: [expect.objectContaining({ id: "history-1", action: "created" })],
      }),
    ]);
  });

  it("normaliza IMEI vazio e usa revisão/status no patch sem permitir identidade injetada", async () => {
    usedStockUnit.findUnique
      .mockResolvedValueOnce(unit())
      .mockResolvedValueOnce(withHistory({ imei: null, revision: 2 }));
    usedStockUnit.updateMany.mockResolvedValue({ count: 1 });
    usedStockHistory.create.mockResolvedValue({});

    await service.patch(actor, "unit-1", { expectedRevision: 1, imei: "   " });
    expect(usedStockUnit.updateMany).toHaveBeenCalledWith({
      where: { id: "unit-1", revision: 1, status: UsedStockStatus.draft },
      data: expect.objectContaining({ imei: null, revision: { increment: 1 } }),
    });
    await expect(
      service.patch(actor, "unit-1", { expectedRevision: 1, model: "fraudado" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("exige catálogo ativo e fotos reais válidas na ativação", async () => {
    const activate = () =>
      service.activate(actor, "unit-1", {
        expectedRevision: 1,
        received: true,
        checked: true,
      });

    usedStockUnit.findUnique.mockResolvedValueOnce(unit({ catalogVariantId: null, catalogVariant: null }));
    await expect(activate()).rejects.toBeInstanceOf(BadRequestException);

    usedStockUnit.findUnique.mockResolvedValueOnce(
      unit({ catalogVariant: catalogVariant({ isActive: false }) }),
    );
    await expect(activate()).rejects.toBeInstanceOf(BadRequestException);

    usedStockUnit.findUnique.mockResolvedValueOnce(
      unit({ imageIsIllustrative: true, realImages: [fixturePhoto] }),
    );
    await expect(activate()).rejects.toBeInstanceOf(BadRequestException);

    usedStockUnit.findUnique.mockResolvedValueOnce(
      unit({ image: fixturePhoto, realImages: [otherFixturePhoto] }),
    );
    await expect(activate()).rejects.toBeInstanceOf(BadRequestException);

    usedStockUnit.findUnique.mockResolvedValueOnce(
      unit({
        image: "/assets/used-stock/iphone16-pro-max-natural.jpg",
        realImages: ["/assets/used-stock/iphone16-pro-max-natural.jpg"],
      }),
    );
    await expect(activate()).rejects.toBeInstanceOf(BadRequestException);
    expect(usedStockUnit.updateMany).not.toHaveBeenCalled();
  });

  it("ativa unidade completa, registra histórico e mantém revisão otimista", async () => {
    usedStockUnit.findUnique
      .mockResolvedValueOnce(unit())
      .mockResolvedValueOnce(withHistory({ status: UsedStockStatus.available, revision: 2 }));
    usedStockUnit.updateMany.mockResolvedValue({ count: 1 });
    usedStockHistory.create.mockResolvedValue({});

    await service.activate(actor, "unit-1", {
      expectedRevision: 1,
      received: true,
      checked: true,
    });
    expect(usedStockUnit.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "unit-1", revision: 1, status: UsedStockStatus.draft },
        data: expect.objectContaining({ status: UsedStockStatus.available, revision: { increment: 1 } }),
      }),
    );
    expect(usedStockHistory.create).toHaveBeenCalledWith({
      data: { unitId: "unit-1", actorId: actor.id, action: "activated" },
    });
  });

  it("mantém sold terminal e rejeita revisão concorrente", async () => {
    usedStockUnit.findUnique.mockResolvedValue(unit({ status: UsedStockStatus.sold }));
    await expect(
      service.sold(actor, "unit-1", { expectedRevision: 1 }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.activate(actor, "unit-1", { expectedRevision: 1, received: true, checked: true }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.patch(actor, "unit-1", { expectedRevision: 1, details: "alterar" }),
    ).rejects.toBeInstanceOf(ConflictException);

    usedStockUnit.findUnique.mockResolvedValue(unit({ revision: 2 }));
    usedStockUnit.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.patch(actor, "unit-1", { expectedRevision: 1, details: "alterar" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("lista opções da categoria exata, inclusive inativas, contando várias unidades por variante", async () => {
    productVariant.findMany.mockResolvedValue([
      {
        ...catalogVariant(),
        _count: { usedStockUnits: 2 },
      },
      {
        ...catalogVariant({ id: "variant-seminovo-inativa", isActive: false }),
        _count: { usedStockUnits: 3 },
      },
    ]);

    await expect(service.listCatalogVariants()).resolves.toEqual([
      {
        id: "variant-seminovo-1",
        productGroupId: "group-seminovo-1",
        slug: "iphone-15-seminovo",
        model: "iPhone 15",
        storage: "128GB",
        color: "Preto",
        isActive: true,
        groupIsActive: true,
        unitCount: 2,
      },
      expect.objectContaining({ id: "variant-seminovo-inativa", isActive: false, unitCount: 3 }),
    ]);
    expect(productVariant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productGroup: { is: { category: "iphones-seminovos" } } },
      }),
    );
  });
});
