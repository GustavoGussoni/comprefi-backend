import {
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { Prisma, UsedStockStatus } from "@prisma/client";
import { UsedStockService } from "./used-stock.service";

const actor = { id: "user-1" };
const date = new Date("2026-10-28T12:00:00.000Z");

function unit(overrides: Record<string, unknown> = {}) {
  return {
    id: "unit-1",
    revision: 1,
    creationKey: "d0b9a9d1-1cd6-4ad0-9c7d-8026ea9be7c4",
    creationFingerprint: "fingerprint",
    model: "iPhone 15",
    storage: "128GB",
    color: "Preto",
    battery: 91,
    details: "Sem detalhes.",
    image: "/assets/used-stock/iphone-15.jpg",
    imageIsIllustrative: true,
    realImages: [],
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
  let prisma: { $transaction: jest.Mock; usedStockUnit: typeof usedStockUnit; usedStockHistory: typeof usedStockHistory };
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
    prisma = {
      $transaction: jest.fn(async (callback: (tx: typeof prisma) => unknown) => callback(prisma)),
      usedStockUnit,
      usedStockHistory,
    };
    service = new UsedStockService(prisma as never);
  });

  it("expõe na vitrine apenas a whitelist pública e converte Decimal para number", async () => {
    usedStockUnit.findMany.mockResolvedValue([unit()]);
    await expect(service.listPublic()).resolves.toEqual([
      {
        id: "unit-1",
        model: "iPhone 15",
        storage: "128GB",
        color: "Preto",
        battery: 91,
        details: "Sem detalhes.",
        image: "/assets/used-stock/iphone-15.jpg",
        imageIsIllustrative: true,
        realImages: [],
        pixPrice: 2500,
        installments: 12,
        installmentPrice: 250,
      },
    ]);
    expect(usedStockUnit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: UsedStockStatus.available } }),
    );
  });

  it("cria draft, armazena Decimal e registra histórico na mesma transação", async () => {
    usedStockUnit.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(withHistory());
    usedStockUnit.create.mockResolvedValue(unit());
    usedStockHistory.create.mockResolvedValue({});

    const result = await service.create(actor, {
      creationKey: "d0b9a9d1-1cd6-4ad0-9c7d-8026ea9be7c4",
      model: "iPhone 15",
      storage: "128GB",
      color: "Preto",
      pixPrice: 2500.5,
      installmentPrice: 250.25,
      imei: "123456789012345",
    });

    expect(result).toMatchObject({ id: "unit-1", status: "draft", pixPrice: 2500 });
    expect(usedStockUnit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: UsedStockStatus.draft,
          pixPrice: expect.any(Prisma.Decimal),
          installmentPrice: expect.any(Prisma.Decimal),
          createdById: actor.id,
          imageIsIllustrative: true,
        }),
      }),
    );
    expect(usedStockHistory.create).toHaveBeenCalledWith({
      data: { unitId: "unit-1", actorId: actor.id, action: "created" },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("recusa a mesma creationKey quando o fingerprint do corpo diverge", async () => {
    usedStockUnit.findUnique.mockResolvedValue(withHistory({ creationFingerprint: "outro-corpo" }));
    await expect(
      service.create(actor, {
        creationKey: "d0b9a9d1-1cd6-4ad0-9c7d-8026ea9be7c4",
        model: "iPhone 15",
        storage: "128GB",
        color: "Azul",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(usedStockUnit.create).not.toHaveBeenCalled();
  });

  it("normaliza IMEI vazio em patch para null e usa revision/status no updateMany", async () => {
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
  });

  it("rejeita patch vazio, campos controlados, revisão concorrente e IMEI duplicado", async () => {
    await expect(service.patch(actor, "unit-1", { expectedRevision: 1 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.patch(actor, "unit-1", { expectedRevision: 1, status: "available" }),
    ).rejects.toBeInstanceOf(BadRequestException);

    usedStockUnit.findUnique.mockResolvedValue(unit());
    usedStockUnit.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.patch(actor, "unit-1", { expectedRevision: 1, color: "Azul" }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(usedStockHistory.create).not.toHaveBeenCalled();
  });

  it("exige recebimento/conferência e cadastro completo/valores positivos para ativar", async () => {
    await expect(
      service.activate(actor, "unit-1", {
        expectedRevision: 1,
        received: false,
        checked: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    usedStockUnit.findUnique.mockResolvedValue(unit({ pixPrice: new Prisma.Decimal(0) }));
    await expect(
      service.activate(actor, "unit-1", {
        expectedRevision: 1,
        received: true,
        checked: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(usedStockUnit.updateMany).not.toHaveBeenCalled();
  });

  it("não permite reativar, editar ou desativar unidade sold terminal", async () => {
    usedStockUnit.findUnique.mockResolvedValue(unit({ status: UsedStockStatus.sold }));
    await expect(
      service.sold(actor, "unit-1", { expectedRevision: 1 }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.activate(actor, "unit-1", { expectedRevision: 1, received: true, checked: true }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.patch(actor, "unit-1", { expectedRevision: 1, color: "Azul" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
