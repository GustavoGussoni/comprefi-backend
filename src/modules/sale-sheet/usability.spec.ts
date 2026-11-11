import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { SaleSheetService } from "./sale-sheet.service";
import { UnitSheetRepository } from "./test-support";
import { fictitiousTerms, fictitiousCustomer } from "./contract/fixtures";
import { demoSeller } from "./contract/seller";
import type { SheetActor } from "./sale-sheet.types";

const sales: SheetActor = {
  id: "sales-usability-test",
  name: "Vendas fictícias",
  email: "sales@example.test",
  role: "SALES",
};
const admin: SheetActor = {
  ...sales,
  id: "admin-usability-test",
  role: "ADMIN",
};
const stranger: SheetActor = { ...sales, id: "stranger-usability-test" };
const terms = () => ({
  ...fictitiousTerms(),
  items: [
    {
      variantId: "variant-fake",
      groupSlug: "ignored",
      product: "ignored",
      color: "ignored",
      storage: "ignored",
      condition: "Novo e lacrado",
      quantity: 1,
    },
  ],
});
const submission = () => ({ accepted: true, customer: fictitiousCustomer });
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
function setup(repository = new UnitSheetRepository()) {
  const send = jest.fn(async () => ({ status: 200 }));
  const render = jest.fn(async () => Buffer.from("%PDF-usability-ficticio"));
  const catalog = {
    list: jest.fn(async () => [
      {
        id: "variant-fake",
        product: "Produto fictício",
        model: "Modelo fictício",
        category: "Teste",
        groupSlug: "teste",
        color: "Prata",
        storage: "256GB",
        condition: "Novo e lacrado",
        image: "",
        crmMappingStatus: "confirmed" as const,
        crmSku: "SKU-FAKE-V1",
      },
    ]),
  };
  const service = new SaleSheetService(
    repository,
    catalog,
    { version: "usability-fake-v1", render },
    demoSeller,
    { mode: "datacrazy", send },
  );
  return { service, repository, send, render, catalog };
}
async function pending() {
  const p = setup();
  const created = await p.service.create(
    sales,
    terms(),
    "create-usability-0001",
  );
  return { ...p, created, id: created.sheet.id };
}

describe("ficha usabilidade: edição antes do cadastro", () => {
  it("edita termos, revalida SKU e gira token atomicamente sem alterar hash da criação", async () => {
    const p = await pending();
    const original = (await p.repository.get(p.id))!;
    p.catalog.list.mockResolvedValue([
      { ...(await p.catalog.list())[0], crmSku: "SKU-FAKE-V2" },
    ]);
    const edited = await p.service.edit(
      sales,
      p.id,
      { revision: 1, terms: { ...terms(), notes: "Editado fictício" } },
      "edit-usability-0001",
    );
    expect(edited).toMatchObject({
      replayed: false,
      sheet: {
        id: p.id,
        revision: 2,
        notes: "Editado fictício",
        createdAt: original.createdAt,
        createdBy: original.createdBy,
      },
    });
    expect(edited.token).toBeDefined();
    const row = (await p.repository.get(p.id))!;
    expect(row.items[0].crmSku).toBe("SKU-FAKE-V2");
    expect(row.items[0].lineId).not.toBe(original.items[0].lineId);
    expect(row.tokenHash).toBe(hash(edited.token!));
    expect(row.creationKeyHash).toBe(original.creationKeyHash);
    expect(row.creationBodyHash).toBe(original.creationBodyHash);
    expect(row.editOperations).toMatchObject([
      { keyHash: hash("edit-usability-0001"), resultVersion: 2 },
    ]);
    expect(JSON.stringify(row)).not.toContain(edited.token!);
    expect(JSON.stringify(row)).not.toContain("edit-usability-0001");
    expect(JSON.stringify(edited.sheet)).not.toMatch(
      /editOperations|cancelOperation|keyHash|bodyHash/,
    );
    await expect(p.service.getPublic(p.created.token!)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      p.service.submitPublic(
        p.created.token!,
        "submit-usability-0001",
        submission(),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(await p.service.getPublic(edited.token!)).toMatchObject({
      revision: 2,
    });
    expect(p.send).not.toHaveBeenCalled();
    expect(p.render).not.toHaveBeenCalled();
  });

  it("retry persistido não consulta catálogo nem gira token; criação permanece separada", async () => {
    const p = await pending();
    const body = { revision: 1, terms: terms() };
    // Same literal key as creation is valid, but not the same namespace.
    const edited = await p.service.edit(
      sales,
      p.id,
      body,
      "create-usability-0001",
    );
    const frozen = await p.repository.get(p.id);
    const restarted = setup(p.repository);
    restarted.catalog.list.mockRejectedValue(
      new Error("não deve consultar catálogo"),
    );
    expect(
      await restarted.service.edit(sales, p.id, body, "create-usability-0001"),
    ).toEqual({ sheet: edited.sheet, replayed: true });
    expect(await p.repository.get(p.id)).toEqual(frozen);
    expect(restarted.catalog.list).not.toHaveBeenCalled();
    await expect(
      restarted.service.edit(
        sales,
        p.id,
        { ...body, terms: { ...terms(), notes: "outro" } },
        "create-usability-0001",
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      await p.service.create(sales, terms(), "create-usability-0001"),
    ).toEqual({ sheet: edited.sheet, replayed: true });
    expect(restarted.send).not.toHaveBeenCalled();
  });

  it("duplicate edit concorrente entre instâncias aplica uma vez e entrega um token", async () => {
    const p = await pending();
    const second = setup(p.repository);
    const body = { revision: 1, terms: terms() };
    const results = await Promise.all([
      p.service.edit(sales, p.id, body, "edit-usability-0001"),
      second.service.edit(sales, p.id, body, "edit-usability-0001"),
    ]);
    expect(results.filter((value) => !value.replayed)).toHaveLength(1);
    expect(results.filter((value) => value.token)).toHaveLength(1);
    expect((await p.repository.get(p.id))!.editOperations).toHaveLength(1);
    expect((await p.repository.get(p.id))!.revision).toBe(2);
  });

  it.each(["submitted", "canceled"])(
    "retry de edição antiga em estado %s retorna snapshot atual sem reaplicar",
    async (state) => {
      const p = await pending();
      const body = { revision: 1, terms: terms() };
      const edited = await p.service.edit(
        sales,
        p.id,
        body,
        "edit-usability-0001",
      );
      if (state === "submitted") {
        await p.service.submitPublic(
          edited.token!,
          "submit-usability-0001",
          submission(),
        );
      } else {
        await p.service.cancel(sales, p.id, { revision: 2 });
      }
      const archived = await p.service.archive(sales, p.id, { revision: 3 });
      const frozen = await p.repository.get(p.id);
      const sendCount = p.send.mock.calls.length;
      const renderCount = p.render.mock.calls.length;
      p.catalog.list.mockRejectedValue(
        new Error("não reler catálogo no replay"),
      );
      expect(
        await p.service.edit(sales, p.id, body, "edit-usability-0001"),
      ).toEqual({ sheet: archived, replayed: true });
      expect(await p.repository.get(p.id)).toEqual(frozen);
      expect(p.send).toHaveBeenCalledTimes(sendCount);
      expect(p.render).toHaveBeenCalledTimes(renderCount);
    },
  );

  it("disputa edit × edit com chaves diferentes concede só uma revisão", async () => {
    const p = await pending();
    const second = setup(p.repository);
    const results = await Promise.allSettled([
      p.service.edit(
        sales,
        p.id,
        { revision: 1, terms: terms() },
        "edit-usability-0001",
      ),
      second.service.edit(
        sales,
        p.id,
        { revision: 1, terms: { ...terms(), notes: "concorrente" } },
        "edit-usability-0002",
      ),
    ]);
    expect(
      results.filter((value) => value.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      (
        results.find(
          (value) => value.status === "rejected",
        ) as PromiseRejectedResult
      ).reason,
    ).toBeInstanceOf(ConflictException);
    expect((await p.repository.get(p.id))!.revision).toBe(2);
  });

  it.each(["edit", "submit"])(
    "disputa edit × submit: %s vence sem snapshot híbrido",
    async (winner) => {
      const p = await pending();
      let entered!: () => void;
      const firstEntered = new Promise<void>((resolve) => {
        entered = resolve;
      });
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const transaction = p.repository.transact.bind(p.repository);
      let first = true;
      jest.spyOn(p.repository, "transact").mockImplementation(async (fn) => {
        if (first) {
          first = false;
          return transaction(async (sheets, docs) => {
            entered();
            await gate;
            return fn(sheets, docs);
          });
        }
        return transaction(fn);
      });
      const edit = () =>
        p.service.edit(
          sales,
          p.id,
          { revision: 1, terms: { ...terms(), notes: "vencedor" } },
          "edit-usability-0001",
        );
      const submit = () =>
        p.service.submitPublic(
          p.created.token!,
          "submit-usability-0001",
          submission(),
        );
      const a = winner === "edit" ? edit() : submit();
      await firstEntered;
      const b = winner === "edit" ? submit() : edit();
      const resultsPromise = Promise.allSettled([a, b]);
      release();
      const results = await resultsPromise;
      expect(results[0].status).toBe("fulfilled");
      expect(results[1].status).toBe("rejected");
      const row = (await p.repository.get(p.id))!;
      expect(row.revision).toBe(2);
      if (winner === "edit") {
        expect((results[1] as PromiseRejectedResult).reason).toBeInstanceOf(
          NotFoundException,
        );
        expect(row.submittedAt).toBeUndefined();
        expect(row.customer).toBeUndefined();
        expect(p.send).not.toHaveBeenCalled();
        expect(p.render).not.toHaveBeenCalled();
      } else {
        expect((results[1] as PromiseRejectedResult).reason).toBeInstanceOf(
          ConflictException,
        );
        expect(row.notes).toBe(terms().notes);
        expect(row.editOperations).toBeUndefined();
        expect(row.pdf.status).toBe("ready");
        expect(p.send).toHaveBeenCalledTimes(1);
      }
    },
  );

  it.each([
    { payment: "pix", pix: 1, card: 0 },
    { payment: "card", pix: 0, card: 1 },
    { payment: "mixed", pix: 0, card: 19000 },
    { payment: "mixed", pix: 10000, card: 1 },
    { installments: 0 },
    { installments: 25 },
    { base: 1.001 },
    { hasTrade: false, credit: 1 },
    { hasTrade: true, credit: 0 },
    { hasTrade: true, tradeModel: " " },
    { hasTrade: true, tradeColor: " " },
    { delivery: "date", deadline: "2026-02-30" },
    { delivery: "date", deadline: "2000-01-01" },
    { delivery: "standard", deadline: "2099-01-01" },
    { items: [] },
    { items: [{ ...terms().items[0], variantId: "unknown" }] },
    {
      items: [
        {
          ...terms().items[0],
          variantId: null,
          image: "https://example.test/image",
        },
      ],
    },
    { items: [{ ...terms().items[0], crmSku: "SKU-INJETADO" }] },
  ])("rejeita termos inválidos sem mudar estado (%j)", async (change) => {
    const p = await pending();
    const before = await p.repository.get(p.id);
    await expect(
      p.service.edit(
        sales,
        p.id,
        { revision: 1, terms: { ...terms(), ...change } },
        "edit-usability-0001",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await p.repository.get(p.id)).toEqual(before);
    expect(p.send).not.toHaveBeenCalled();
    expect(p.render).not.toHaveBeenCalled();
  });

  it.each([
    { payment: "pix", pix: 18700, card: 0 },
    { payment: "card", pix: 0, card: 20000, installments: 24 },
    { payment: "mixed", pix: 10000, card: 9300 },
    {
      hasTrade: false,
      credit: 0,
      tradeModel: "",
      tradeStorage: "",
      tradeColor: "",
      tradeNotes: "",
    },
    { delivery: "date", deadline: "2099-01-01" },
  ])("aceita regras de criação (%j)", async (change) => {
    const p = await pending();
    await expect(
      p.service.edit(
        sales,
        p.id,
        { revision: 1, terms: { ...terms(), ...change } },
        "edit-usability-0001",
      ),
    ).resolves.toMatchObject({ sheet: { revision: 2 } });
  });

  it.each([
    undefined,
    {},
    { revision: "1", terms: terms() },
    { revision: 0, terms: terms() },
    { revision: 1 },
    { revision: 1, terms: null },
    { revision: 1, terms: terms(), unknown: true },
  ])("DTO inválido produz copy PTBR (%j)", async (body) => {
    const p = await pending();
    const error = await p.service
      .edit(sales, p.id, body, "edit-usability-0001")
      .catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as Error).message).toBe(
      "Dados inválidos. Confira a revisão e os dados informados.",
    );
  });

  it("chave obrigatória; stale revision e estados finais rejeitados", async () => {
    const p = await pending();
    await expect(
      p.service.edit(sales, p.id, { revision: 1, terms: terms() }, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      p.service.edit(
        sales,
        p.id,
        { revision: 2, terms: terms() },
        "edit-usability-0001",
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await p.service.cancel(sales, p.id, { revision: 1 });
    await expect(
      p.service.edit(
        sales,
        p.id,
        { revision: 2, terms: terms() },
        "edit-usability-0001",
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await p.service.archive(sales, p.id, { revision: 2 });
    await expect(p.service.rotateLink(sales, p.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});

describe("ficha usabilidade: cancelar e arquivar preservando histórico", () => {
  it("cancel atômico revoga, replay não muta, legacy revoked também representa cancelamento", async () => {
    const p = await pending();
    const result = await p.service.cancel(sales, p.id, { revision: 1 });
    expect(result).toMatchObject({ revoked: true, revision: 2 });
    const row = await p.repository.get(p.id);
    expect(await p.service.cancel(admin, p.id, { revision: 1 })).toEqual(
      result,
    );
    expect(await p.service.cancel(sales, p.id, { revision: 2 })).toEqual(
      result,
    );
    expect(await p.repository.get(p.id)).toEqual(row);
    await expect(p.service.getPublic(p.created.token!)).rejects.toBeInstanceOf(
      GoneException,
    );
    await expect(
      p.service.submitPublic(
        p.created.token!,
        "submit-usability-0001",
        submission(),
      ),
    ).rejects.toBeInstanceOf(GoneException);
    expect(p.send).not.toHaveBeenCalled();
    expect(p.render).not.toHaveBeenCalled();
    const other = await p.service.create(
      sales,
      terms(),
      "create-usability-0002",
    );
    await p.service.revokeLink(sales, other.sheet.id);
    expect(
      await p.service.cancel(sales, other.sheet.id, { revision: 2 }),
    ).toMatchObject({ revoked: true, revision: 2 });
  });

  it("cancel disputa com edição exige revisão nova; cancel stale não aplica", async () => {
    const p = await pending();
    await p.service.edit(
      sales,
      p.id,
      { revision: 1, terms: terms() },
      "edit-usability-0001",
    );
    await expect(
      p.service.cancel(sales, p.id, { revision: 1 }),
    ).rejects.toBeInstanceOf(ConflictException);
    await p.service.cancel(sales, p.id, { revision: 2 });
    await expect(
      p.service.cancel(sales, p.id, { revision: 1 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect((await p.repository.get(p.id))!.revision).toBe(3);
  });

  it("archive só fichas recebidas/canceladas, sem elevar revisão e lista inclui todas", async () => {
    const p = await pending();
    await expect(
      p.service.archive(sales, p.id, { revision: 1 }),
    ).rejects.toBeInstanceOf(ConflictException);
    await p.service.cancel(sales, p.id, { revision: 1 });
    await expect(
      p.service.archive(sales, p.id, { revision: 1 }),
    ).rejects.toBeInstanceOf(ConflictException);
    const archived = await p.service.archive(admin, p.id, { revision: 2 });
    expect(archived).toMatchObject({
      archivedBy: admin.id,
      revision: 2,
      revoked: true,
    });
    expect(archived.archivedAt).toBeDefined();
    expect(await p.service.archive(sales, p.id, { revision: 2 })).toEqual(
      archived,
    );
    expect(await p.service.listAdmin(sales)).toEqual([archived]);
    expect(await p.service.listAdmin(admin)).toEqual([archived]);
    expect(await p.service.listAdmin(stranger)).toEqual([]);
  });

  it("archive de recebida mantém PDF, snapshot CRM, cadastro e disponibilidade pública", async () => {
    const p = await pending();
    await p.service.submitPublic(
      p.created.token!,
      "submit-usability-0001",
      submission(),
    );
    const before = (await p.repository.get(p.id))!;
    const pdf = await p.service.getContract(sales, p.id);
    const payload = await p.service.crmPayload(admin, p.id);
    await p.service.archive(sales, p.id, { revision: 2 });
    const {
      archivedAt: _at,
      archivedBy: _by,
      ...after
    } = (await p.repository.get(p.id))!;
    expect(after).toEqual(before);
    expect(await p.service.getContract(sales, p.id)).toEqual(pdf);
    expect(await p.service.crmPayload(admin, p.id)).toEqual(payload);
    expect(await p.service.getPublic(p.created.token!)).toMatchObject({
      submitted: true,
      revision: 2,
    });
    expect(
      JSON.stringify(await p.service.getPublic(p.created.token!)),
    ).not.toMatch(/archivedAt|archivedBy|editOperations|cancelOperation/);
    await p.service.submitPublic(
      p.created.token!,
      "submit-usability-0001",
      submission(),
    );
    await expect(
      p.service.cancel(sales, p.id, { revision: 2 }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      p.service.edit(
        sales,
        p.id,
        { revision: 2, terms: terms() },
        "edit-usability-0001",
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(p.render).toHaveBeenCalledTimes(1);
    expect(p.send).toHaveBeenCalledTimes(1);
  });

  it("archive não impede retry de PDF falhado nem preparação CRM pendente", async () => {
    const p = await pending();
    p.render.mockRejectedValueOnce(new Error("falha fictícia"));
    // Manual items block preparation only; this is the pre-existing CRM guarantee.
    const edited = await p.service.edit(
      sales,
      p.id,
      {
        revision: 1,
        terms: {
          ...terms(),
          items: [{ ...terms().items[0], variantId: null }],
        },
      },
      "edit-usability-0001",
    );
    await p.service.submitPublic(
      edited.token!,
      "submit-usability-0001",
      submission(),
    );
    expect((await p.repository.get(p.id))!.crm.status).toBe("failed");
    await p.service.archive(sales, p.id, { revision: 3 });
    await expect(p.service.retryContract(sales, p.id)).resolves.toMatchObject({
      revision: 3,
      pdf: { status: "ready" },
      archivedBy: sales.id,
    });
    await expect(p.service.retryCrm(admin, p.id)).resolves.toMatchObject({
      revision: 3,
      crm: { status: "failed" },
      archivedBy: sales.id,
    });
    expect(p.send).not.toHaveBeenCalled();
    expect(p.render).toHaveBeenCalledTimes(2);
  });

  it.each(["edit", "cancel", "archive"])(
    "propriedade/roles válidos em %s inclusive chamadas diretas",
    async (action) => {
      const p = await pending();
      const call = (actor: SheetActor) =>
        action === "edit"
          ? p.service.edit(
              actor,
              p.id,
              { revision: 1, terms: terms() },
              "edit-usability-0001",
            )
          : action === "cancel"
            ? p.service.cancel(actor, p.id, { revision: 1 })
            : p.service.archive(actor, p.id, { revision: 1 });
      await expect(call(stranger)).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        call({ ...sales, role: "OTHER" as never }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      if (action === "archive") await p.service.revokeLink(sales, p.id);
      const adminCall =
        action === "archive"
          ? p.service.archive(admin, p.id, { revision: 2 })
          : call(admin);
      const result = await adminCall;
      expect("sheet" in result ? result.sheet.revision : result.revision).toBe(
        2,
      );
      // Snapshot actions return no envelope.
      expect((await p.repository.get(p.id))!.revision).toBe(2);
    },
  );
});

describe("pedidos: desarquivar somente metadados", () => {
  const timestamp = "2026-11-11T12:00:00.000Z";
  const timestampNext = "2026-11-11T12:00:00.001Z";
  async function canceled() {
    const p = await pending();
    await p.service.cancel(sales, p.id, { revision: 1 });
    const archived = await p.service.archive(sales, p.id, { revision: 2 });
    return {
      ...p,
      archived,
      body: { revision: 2, archivedAt: archived.archivedAt! },
    };
  }

  it("recebido archive → unarchive → archive mantém PDF, vendedor, cliente, termos, CRM e replay público", async () => {
    const p = await pending();
    await p.service.submitPublic(
      p.created.token!,
      "submit-unarchive-0001",
      submission(),
    );
    const before = (await p.repository.get(p.id))!;
    const pdf = await p.service.getContract(sales, p.id);
    const payload = await p.service.crmPayload(admin, p.id);
    const view = await p.service.getPublic(p.created.token!);
    const replay = await p.service.submitPublic(
      p.created.token!,
      "submit-unarchive-0001",
      submission(),
    );
    const archived = await p.service.archive(sales, p.id, { revision: 2 });
    const restarted = setup(p.repository);
    restarted.catalog.list.mockRejectedValue(
      new Error("catálogo não pode executar"),
    );
    const result = await restarted.service.unarchive(admin, p.id, {
      revision: 2,
      archivedAt: archived.archivedAt,
    });
    expect(result).not.toHaveProperty("archivedAt");
    expect(result).not.toHaveProperty("archivedBy");
    expect(await p.repository.get(p.id)).toEqual(before);
    expect(await p.service.getContract(sales, p.id)).toEqual(pdf);
    expect(await p.service.crmPayload(admin, p.id)).toEqual(payload);
    expect(await p.service.getPublic(p.created.token!)).toEqual(view);
    expect(
      await p.service.submitPublic(
        p.created.token!,
        "submit-unarchive-0001",
        submission(),
      ),
    ).toEqual(replay);
    await expect(
      p.service.edit(
        sales,
        p.id,
        { revision: 2, terms: terms() },
        "edit-unarchive-0001",
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    const again = await p.service.archive(admin, p.id, { revision: 2 });
    const {
      archivedAt: _at,
      archivedBy: _by,
      ...after
    } = (await p.repository.get(p.id))!;
    expect(after).toEqual(before);
    expect(again.revision).toBe(2);
    expect(await p.service.getPublic(p.created.token!)).toEqual(view);
    expect(
      await p.service.submitPublic(
        p.created.token!,
        "submit-unarchive-0001",
        submission(),
      ),
    ).toEqual(replay);
    expect(p.render).toHaveBeenCalledTimes(1);
    expect(p.send).toHaveBeenCalledTimes(1);
    expect(restarted.catalog.list).not.toHaveBeenCalled();
    expect(restarted.render).not.toHaveBeenCalled();
    expect(restarted.send).not.toHaveBeenCalled();
  });

  it("cancelado permanece revogado, com link inválido e edição/rotação bloqueadas", async () => {
    const p = await canceled();
    const frozen = (await p.repository.get(p.id))!;
    const { archivedAt: _at, archivedBy: _by, ...expected } = frozen;
    await p.service.unarchive(sales, p.id, p.body);
    expect(await p.repository.get(p.id)).toEqual(expected);
    expect(expected).toMatchObject({ revoked: true, revision: 2 });
    await expect(p.service.getPublic(p.created.token!)).rejects.toBeInstanceOf(
      GoneException,
    );
    await expect(
      p.service.submitPublic(
        p.created.token!,
        "submit-unarchive-0001",
        submission(),
      ),
    ).rejects.toBeInstanceOf(GoneException);
    await expect(
      p.service.edit(
        sales,
        p.id,
        { revision: 2, terms: terms() },
        "edit-unarchive-0001",
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(p.service.rotateLink(sales, p.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(await p.repository.get(p.id)).toEqual(expected);
    expect(p.render).not.toHaveBeenCalled();
    expect(p.send).not.toHaveBeenCalled();
  });

  it("revisão incorreta conflita arquivado ou já desarquivado; replay correto é no-op", async () => {
    const p = await canceled();
    const frozen = await p.repository.get(p.id);
    await expect(
      p.service.unarchive(sales, p.id, { ...p.body, revision: 1 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(await p.repository.get(p.id)).toEqual(frozen);
    const result = await p.service.unarchive(sales, p.id, p.body);
    const after = await p.repository.get(p.id);
    expect(await p.service.unarchive(admin, p.id, p.body)).toEqual(result);
    expect(await p.repository.get(p.id)).toEqual(after);
    await expect(
      p.service.unarchive(sales, p.id, { ...p.body, revision: 9 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(await p.repository.get(p.id)).toEqual(after);
  });

  it("replay do ciclo antigo não apaga novo arquivamento mesmo com revisão igual", async () => {
    const p = await canceled();
    await p.repository.transact((sheets) => {
      sheets.find((sheet) => sheet.id === p.id)!.archivedAt = timestamp;
    });
    const oldBody = { revision: 2, archivedAt: timestamp };
    await p.service.unarchive(sales, p.id, oldBody);
    await p.service.archive(admin, p.id, { revision: 2 });
    await p.repository.transact((sheets) => {
      sheets.find((sheet) => sheet.id === p.id)!.archivedAt = timestampNext;
    });
    const newCycle = await p.repository.get(p.id);
    await expect(
      p.service.unarchive(sales, p.id, oldBody),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(await p.repository.get(p.id)).toEqual(newCycle);
    expect(
      await p.service.unarchive(sales, p.id, {
        revision: 2,
        archivedAt: timestampNext,
      }),
    ).toMatchObject({ revision: 2, revoked: true });
  });

  it.each([sales, admin])(
    "perfil autorizado desarquiva pedido próprio/outra pessoa (%s)",
    async (actor) => {
      const p = await canceled();
      await expect(
        p.service.unarchive(actor, p.id, p.body),
      ).resolves.toMatchObject({ revision: 2 });
    },
  );

  it.each([stranger, { ...sales, role: "OTHER" as never }])(
    "perfil não autorizado não altera pedido (%s)",
    async (actor) => {
      const p = await canceled();
      const before = await p.repository.get(p.id);
      await expect(
        p.service.unarchive(actor, p.id, p.body),
      ).rejects.toBeInstanceOf(
        actor === stranger ? NotFoundException : ForbiddenException,
      );
      expect(await p.repository.get(p.id)).toEqual(before);
    },
  );

  it.each([
    undefined,
    null,
    [],
    "invalid",
    {},
    { revision: 2 },
    { revision: "2", archivedAt: timestamp },
    { revision: 0, archivedAt: timestamp },
    { revision: 2.5, archivedAt: timestamp },
    { revision: 2147483648, archivedAt: timestamp },
    { revision: 2, archivedAt: null },
    { revision: 2, archivedAt: 123 },
    { revision: 2, archivedAt: "" },
    { revision: 2, archivedAt: "2026-11-11" },
    { revision: 2, archivedAt: "2026-11-11T12:00:00Z" },
    { revision: 2, archivedAt: "2026-11-11T12:00:00.000+00:00" },
    { revision: 2, archivedAt: "2026-11-11T12:00:00.000z" },
    { revision: 2, archivedAt: " 2026-11-11T12:00:00.000Z" },
    { revision: 2, archivedAt: "2026-02-30T12:00:00.000Z" },
    { revision: 2, archivedAt: "2026-11-11T24:00:00.000Z" },
    { revision: 2, archivedAt: "2026-11-11T12:60:00.000Z" },
    { revision: 2, archivedAt: "2026-11-11T12:00:60.000Z" },
    { revision: 2, archivedAt: timestamp, revoked: false },
  ])(
    "body inválido é rejeitado com mensagem simples PTBR sem alterar estado (%j)",
    async (body) => {
      const p = await canceled();
      const before = await p.repository.get(p.id);
      const error = await p.service
        .unarchive(sales, p.id, body)
        .catch((reason: unknown) => reason);
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as Error).message).toBe(
        "Dados inválidos. Confira a revisão e a data de arquivamento do pedido.",
      );
      expect(await p.repository.get(p.id)).toEqual(before);
    },
  );

  it("pedido não arquivado é no-op sem exigir estado recebido/cancelado", async () => {
    const p = await pending();
    const before = await p.repository.get(p.id);
    const result = await p.service.unarchive(sales, p.id, {
      revision: 1,
      archivedAt: timestamp,
    });
    expect(result).toEqual(p.created.sheet);
    expect(await p.repository.get(p.id)).toEqual(before);
  });

  it("PDF/CRM falhados ou pendentes não são reparados ou normalizados", async () => {
    const p = await pending();
    p.render.mockRejectedValueOnce(new Error("falha fictícia"));
    const edited = await p.service.edit(
      sales,
      p.id,
      {
        revision: 1,
        terms: {
          ...terms(),
          items: [{ ...terms().items[0], variantId: null }],
        },
      },
      "edit-unarchive-failed",
    );
    await p.service.submitPublic(
      edited.token!,
      "submit-unarchive-failed",
      submission(),
    );
    const before = (await p.repository.get(p.id))!;
    expect(before.pdf.status).toBe("failed");
    expect(before.crm.status).toBe("failed");
    const archived = await p.service.archive(sales, p.id, { revision: 3 });
    const restarted = setup(p.repository);
    restarted.catalog.list.mockRejectedValue(new Error("não consultar"));
    await restarted.service.unarchive(sales, p.id, {
      revision: 3,
      archivedAt: archived.archivedAt,
    });
    expect(await p.repository.get(p.id)).toEqual(before);
    expect(restarted.catalog.list).not.toHaveBeenCalled();
    expect(restarted.render).not.toHaveBeenCalled();
    expect(restarted.send).not.toHaveBeenCalled();
  });

  it("revisão é verificada dentro da transação, não apenas no snapshot inicial", async () => {
    const p = await canceled();
    const original = p.repository.transact.bind(p.repository);
    let entered!: () => void;
    const enteredPromise = new Promise<void>((resolve) => {
      entered = resolve;
    });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const writer = original(async (sheets) => {
      entered();
      await gate;
      sheets.find((sheet) => sheet.id === p.id)!.revision = 3;
    });
    await enteredPromise;
    const attempted = p.service.unarchive(sales, p.id, p.body);
    const outcome = Promise.allSettled([writer, attempted]);
    release();
    const results = await outcome;
    expect(results[1].status).toBe("rejected");
    expect((results[1] as PromiseRejectedResult).reason).toBeInstanceOf(
      ConflictException,
    );
    expect(await p.repository.get(p.id)).toMatchObject({
      revision: 3,
      archivedAt: p.body.archivedAt,
      archivedBy: sales.id,
    });
  });
});
