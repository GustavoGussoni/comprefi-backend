import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from "@nestjs/common";
import { SaleSheetService } from "./sale-sheet.service";
import { UnitSheetRepository } from "./test-support";
import { fictitiousTerms, fictitiousCustomer } from "./contract/fixtures";
import { demoSeller } from "./contract/seller";
import { buildCrmPayload } from "./crm/payload";
import type { SheetActor, StoredSheet } from "./sale-sheet.types";

const sales: SheetActor = {
  id: "finalization-sales-fake",
  name: "Operador Fictício",
  email: "sales@example.test",
  role: "SALES",
};
const admin = {
  ...sales,
  id: "finalization-admin-fake",
  name: "Admin Fictício",
  role: "ADMIN" as const,
};
const other = { ...sales, id: "finalization-other-fake" };
const timestamp = "2026-11-12T15:00:00.000Z";
const submission = () => ({ accepted: true, customer: fictitiousCustomer });
function setup(repository = new UnitSheetRepository()) {
  const render = jest.fn(async () => Buffer.from("%PDF-finalization-fake"));
  const send = jest.fn(async () => ({ status: 200 }));
  const catalog = { list: jest.fn(async () => []) };
  const service = new SaleSheetService(
    repository,
    catalog,
    { version: "finalization-fake", render },
    demoSeller,
    { mode: "datacrazy", send },
  );
  return { service, repository, render, send, catalog };
}
async function pending() {
  const p = setup();
  const created = await p.service.create(
    sales,
    fictitiousTerms(),
    "create-finalization-fake",
  );
  return { ...p, created, id: created.sheet.id };
}
async function responded() {
  const p = await pending();
  await p.service.submitPublic(
    p.created.token!,
    "submit-finalization-fake",
    submission(),
  );
  return p;
}
const withoutOperational = (row: StoredSheet) => {
  const {
    operationalVersion: _version,
    operationalHistory: _history,
    finalizedAt: _at,
    finalizedById: _id,
    finalizedByName: _name,
    ...rest
  } = row;
  return rest;
};

describe("pedidos: finalização operacional manual independente", () => {
  it("legado sem campos permanece intacto; cadastro/PDF não finalizam", async () => {
    const p = await responded();
    const row = (await p.repository.get(p.id))!;
    expect(row.pdf.status).toBe("ready");
    expect(row).not.toHaveProperty("finalizedAt");
    expect(row).not.toHaveProperty("operationalHistory");
    expect(await p.service.getAdmin(sales, p.id)).toMatchObject({
      revision: 2,
      finalizedAt: null,
      finalizedById: null,
      finalizedByName: null,
    });
    await p.service.listAdmin(sales);
    expect(await p.repository.get(p.id)).toEqual(row);
  });

  it("finalize/reopen só metadados, preserva PDF/cadastro/CRM/vendedor/replay e não libera edição", async () => {
    const p = await responded();
    const before = (await p.repository.get(p.id))!;
    const publicBefore = await p.service.getPublic(p.created.token!);
    const pdfBefore = await p.service.getContract(sales, p.id);
    const frozen = setup(p.repository);
    frozen.catalog.list.mockRejectedValue(new Error("não consultar catálogo"));
    const finalized = await frozen.service.finalize(admin, p.id, {
      expectedVersion: 2,
    });
    expect(finalized).toMatchObject({
      revision: 3,
      finalizedById: admin.id,
      finalizedByName: admin.name,
    });
    expect(finalized.finalizedAt).toMatch(/^\d{4}-\d{2}-\d{2}T.*\.\d{3}Z$/);
    const stored = (await p.repository.get(p.id))!;
    expect(stored.revision).toBe(2);
    expect(stored.operationalHistory).toMatchObject([
      {
        action: "finalize",
        actorId: admin.id,
        actorName: admin.name,
        expectedVersion: 2,
        resultVersion: 3,
        finalizedAt: finalized.finalizedAt,
      },
    ]);
    expect(withoutOperational(stored)).toEqual(before);
    const body = {
      expectedVersion: 3,
      expectedFinalizedAt: finalized.finalizedAt,
    };
    const reopened = await frozen.service.reopen(sales, p.id, body);
    expect(reopened).toMatchObject({
      revision: 4,
      finalizedAt: null,
      finalizedById: null,
      finalizedByName: null,
      submittedAt: before.submittedAt,
    });
    expect(withoutOperational((await p.repository.get(p.id))!)).toEqual(before);
    expect(await p.service.getContract(sales, p.id)).toEqual(pdfBefore);
    expect(await p.service.getPublic(p.created.token!)).toEqual(publicBefore);
    expect(
      await p.service.submitPublic(
        p.created.token!,
        "submit-finalization-fake",
        submission(),
      ),
    ).toMatchObject({ revision: 2 });
    await expect(
      p.service.edit(
        sales,
        p.id,
        { revision: 4, terms: fictitiousTerms() },
        "edit-finalization-fake",
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(p.service.rotateLink(sales, p.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(frozen.catalog.list).not.toHaveBeenCalled();
    expect(frozen.render).not.toHaveBeenCalled();
    expect(frozen.send).not.toHaveBeenCalled();
    expect(p.render).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(finalized)).not.toMatch(
      /operationalHistory|operationalVersion/,
    );
    expect(
      JSON.stringify(await p.service.getPublic(p.created.token!)),
    ).not.toMatch(/finalized|operational/);
  });

  it("archive/unarchive preserva conclusão; reopen arquivado não desarquiva", async () => {
    const p = await responded();
    const finalized = await p.service.finalize(sales, p.id, {
      expectedVersion: 2,
    });
    const archived = await p.service.archive(admin, p.id, { revision: 3 });
    expect(archived).toMatchObject({
      finalizedAt: finalized.finalizedAt,
      finalizedById: sales.id,
      revision: 3,
    });
    await expect(
      p.service.finalize(sales, p.id, { expectedVersion: 3 }),
    ).rejects.toBeInstanceOf(ConflictException);
    const unarchived = await p.service.unarchive(admin, p.id, {
      revision: 3,
      archivedAt: archived.archivedAt,
    });
    expect(unarchived).toMatchObject({
      finalizedAt: finalized.finalizedAt,
      revision: 3,
    });
    expect(unarchived).not.toHaveProperty("archivedAt");
    const again = await p.service.archive(sales, p.id, { revision: 3 });
    const reopened = await p.service.reopen(admin, p.id, {
      expectedVersion: 3,
      expectedFinalizedAt: finalized.finalizedAt,
    });
    expect(reopened).toMatchObject({
      revision: 4,
      archivedAt: again.archivedAt,
      finalizedAt: null,
    });
    await expect(
      p.service.unarchive(sales, p.id, {
        revision: 3,
        archivedAt: again.archivedAt,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    const result = await p.service.unarchive(sales, p.id, {
      revision: 4,
      archivedAt: again.archivedAt,
    });
    expect(result).toMatchObject({
      finalizedAt: null,
      submittedAt: finalized.submittedAt,
    });
  });

  it.each(["pending", "canceled", "archived", "responded-revoked"])(
    "não finaliza estado %s",
    async (state) => {
      const p =
        state === "pending" || state === "canceled"
          ? await pending()
          : await responded();
      if (state === "canceled")
        await p.service.cancel(sales, p.id, { revision: 1 });
      if (state === "archived")
        await p.service.archive(sales, p.id, { revision: 2 });
      if (state === "responded-revoked")
        await p.repository.transact((rows) => {
          rows[0].revoked = true;
        });
      const before = (await p.repository.get(p.id))!;
      await expect(
        p.service.finalize(sales, p.id, { expectedVersion: before.revision }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(await p.repository.get(p.id)).toEqual(before);
    },
  );

  it("conclusão independe de status técnico falhado ou pendente, sem retry automático", async () => {
    const p = await responded();
    await p.repository.transact((rows) => {
      rows[0].pdf.status = "failed";
      rows[0].crm.status = "waiting";
    });
    const fresh = setup(p.repository);
    const finalized = await fresh.service.finalize(sales, p.id, {
      expectedVersion: 2,
    });
    expect(finalized).toMatchObject({
      pdf: { status: "failed" },
      crm: { status: "waiting" },
    });
    await fresh.service.reopen(sales, p.id, {
      expectedVersion: 3,
      expectedFinalizedAt: finalized.finalizedAt,
    });
    expect(fresh.send).not.toHaveBeenCalled();
    expect(fresh.render).not.toHaveBeenCalled();
    expect(fresh.catalog.list).not.toHaveBeenCalled();
  });

  it("retry explícito após reopen usa revisão contratual preservada e retorna versão administrativa", async () => {
    const p = await pending();
    p.render.mockRejectedValueOnce(new Error("falha fictícia"));
    await p.service.submitPublic(
      p.created.token!,
      "submit-finalization-fake",
      submission(),
    );
    const finalized = await p.service.finalize(sales, p.id, {
      expectedVersion: 2,
    });
    await p.service.reopen(sales, p.id, {
      expectedVersion: 3,
      expectedFinalizedAt: finalized.finalizedAt,
    });
    expect(await p.service.retryContract(sales, p.id)).toMatchObject({
      revision: 4,
      pdf: { status: "ready" },
      finalizedAt: null,
    });
    expect((await p.repository.get(p.id))!.revision).toBe(2);
    expect(await p.repository.readDocument(p.id, 2)).toBeDefined();
    expect(await p.repository.readDocument(p.id, 4)).toBeUndefined();
    expect(await p.service.retryCrm(admin, p.id)).toMatchObject({
      revision: 4,
      crm: { status: "failed" },
      finalizedAt: null,
    });
    await expect(p.service.rotateLink(sales, p.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(p.service.retryContract(sales, p.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("payload CRM explícito permanece idêntico, sem metadados de finalização", async () => {
    const p = await responded();
    await p.repository.transact((rows) => {
      rows[0].items = rows[0].items.map((item) => ({
        ...item,
        crmMappingStatus: "confirmed",
        crmSku: "SKU-FAKE",
      }));
    });
    const before = buildCrmPayload((await p.repository.get(p.id))!);
    await p.service.finalize(sales, p.id, { expectedVersion: 2 });
    const after = buildCrmPayload((await p.repository.get(p.id))!);
    expect(after).toEqual(before);
    expect(JSON.stringify(after)).not.toMatch(
      /finalized|operational|finalization-sales/,
    );
  });

  it("retry entre instâncias e duplicações preservam operador/data/histórico", async () => {
    const p = await responded();
    const second = setup(p.repository);
    const results = await Promise.all([
      p.service.finalize(sales, p.id, { expectedVersion: 2 }),
      second.service.finalize(admin, p.id, { expectedVersion: 2 }),
    ]);
    expect(results[0]).toEqual(results[1]);
    const before = (await p.repository.get(p.id))!;
    expect(
      await second.service.finalize(admin, p.id, { expectedVersion: 3 }),
    ).toEqual(results[0]);
    expect(await p.repository.get(p.id)).toEqual(before);
    const body = {
      expectedVersion: 3,
      expectedFinalizedAt: results[0].finalizedAt,
    };
    const reopens = await Promise.all([
      p.service.reopen(sales, p.id, body),
      second.service.reopen(admin, p.id, body),
    ]);
    expect(reopens[0]).toEqual(reopens[1]);
    const after = await p.repository.get(p.id);
    expect(await setup(p.repository).service.reopen(admin, p.id, body)).toEqual(
      reopens[0],
    );
    expect(await p.repository.get(p.id)).toEqual(after);
    expect(after.operationalHistory).toHaveLength(2);
  });

  it("retries atrasados não refinalizam reaberto nem apagam ciclo novo mesmo no mesmo milissegundo", async () => {
    const p = await responded();
    jest.spyOn(Date, "now").mockReturnValue(Date.parse(timestamp));
    try {
      const first = await p.service.finalize(sales, p.id, {
        expectedVersion: 2,
      });
      const old = {
        expectedVersion: 3,
        expectedFinalizedAt: first.finalizedAt,
      };
      await p.service.reopen(sales, p.id, old);
      await expect(
        p.service.finalize(sales, p.id, { expectedVersion: 2 }),
      ).rejects.toBeInstanceOf(ConflictException);
      const next = await p.service.finalize(admin, p.id, {
        expectedVersion: 4,
      });
      expect(next.finalizedAt).not.toBe(first.finalizedAt);
      const before = await p.repository.get(p.id);
      await expect(p.service.reopen(sales, p.id, old)).rejects.toBeInstanceOf(
        ConflictException,
      );
      await expect(
        p.service.reopen(sales, p.id, {
          expectedVersion: 5,
          expectedFinalizedAt: first.finalizedAt,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        p.service.finalize(sales, p.id, { expectedVersion: 2 }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(await p.repository.get(p.id)).toEqual(before);
    } finally {
      jest.restoreAllMocks();
    }
  });

  it("reabrir legado revogado não reabre link cancelado nem remove cadastro", async () => {
    const p = await responded();
    await p.repository.transact((rows) => {
      rows[0].finalizedAt = timestamp;
      rows[0].revoked = true;
    });
    const result = await p.service.reopen(admin, p.id, {
      expectedVersion: 2,
      expectedFinalizedAt: timestamp,
    });
    expect(result).toMatchObject({
      revoked: true,
      finalizedAt: null,
      revision: 3,
    });
    await expect(p.service.getPublic(p.created.token!)).rejects.toBeInstanceOf(
      GoneException,
    );
    await expect(p.service.rotateLink(sales, p.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it.each(["finalize", "reopen"] as const)(
    "ADMIN todos SALES próprios e role inválido: %s",
    async (action) => {
      const p = await responded();
      const body =
        action === "finalize"
          ? { expectedVersion: 2 }
          : {
              expectedVersion: 3,
              expectedFinalizedAt: (
                await p.service.finalize(sales, p.id, { expectedVersion: 2 })
              ).finalizedAt,
            };
      const before = await p.repository.get(p.id);
      await expect(p.service[action](other, p.id, body)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(
        p.service[action]({ ...sales, role: "OTHER" as never }, p.id, body),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(await p.repository.get(p.id)).toEqual(before);
      await expect(p.service[action](admin, p.id, body)).resolves.toMatchObject(
        { id: p.id },
      );
    },
  );

  it.each([
    undefined,
    null,
    [],
    {},
    { expectedVersion: "2" },
    { expectedVersion: 0 },
    { expectedVersion: 2.5 },
    { expectedVersion: 2147483648 },
    { expectedVersion: 2, finalizedById: "injected" },
    { revision: 2 },
  ])("finalize rejeita body inválido sem mutar (%j)", async (body) => {
    const p = await responded();
    const before = await p.repository.get(p.id);
    await expect(p.service.finalize(sales, p.id, body)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(await p.repository.get(p.id)).toEqual(before);
  });

  it.each([
    undefined,
    null,
    "",
    123,
    "2026-11-12",
    "2026-11-12T15:00:00Z",
    "2026-11-12T15:00:00.000+00:00",
    "2026-02-30T15:00:00.000Z",
    "2026-11-12T24:00:00.000Z",
    ` ${timestamp}`,
  ])(
    "reopen exige timestamp UTC exato válido (%j)",
    async (expectedFinalizedAt) => {
      const p = await responded();
      await p.service.finalize(sales, p.id, { expectedVersion: 2 });
      const before = await p.repository.get(p.id);
      await expect(
        p.service.reopen(sales, p.id, {
          expectedVersion: 3,
          expectedFinalizedAt,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(await p.repository.get(p.id)).toEqual(before);
    },
  );

  it("CAS é rechecado dentro da transação e non-finalized não é reopen arbitrário", async () => {
    const p = await responded();
    await expect(
      p.service.reopen(sales, p.id, {
        expectedVersion: 2,
        expectedFinalizedAt: timestamp,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    const original = p.repository.transact.bind(p.repository);
    let entered!: () => void;
    const start = new Promise<void>((resolve) => {
      entered = resolve;
    });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const writer = original(async (rows) => {
      entered();
      await gate;
      rows[0].revision = 3;
    });
    await start;
    const attempted = p.service.finalize(sales, p.id, { expectedVersion: 2 });
    const results = Promise.allSettled([writer, attempted]);
    release();
    expect((await results)[1]).toMatchObject({
      status: "rejected",
      reason: expect.any(ConflictException),
    });
    expect((await p.repository.get(p.id))!.finalizedAt).toBeUndefined();
  });
});
