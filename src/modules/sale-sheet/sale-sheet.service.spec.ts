import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { SaleSheetService } from "./sale-sheet.service";
import { UnitSheetRepository } from "./test-support";
import { fictitiousSheet } from "./contract/fixtures";
import { demoSeller } from "./contract/seller";
import { DisabledCrmDeliveryTransport } from "./crm/delivery";
import type {
  CrmDeliveryTransport,
  SellerIdentity,
  SheetActor,
  SheetRenderer,
  StoredSheet,
} from "./sale-sheet.types";
import { MAX_CONTRACT_BYTES } from "./postgres.repository";

const actor: SheetActor = {
  id: "sales-fake-1",
  name: "Vendedor Fictício",
  email: "sales@example.test",
  role: "SALES",
};
const admin: SheetActor = { ...actor, id: "admin-fake-1", role: "ADMIN" };
function terms() {
  const fixture = fictitiousSheet();
  const {
    whatsapp,
    base,
    payment,
    pix,
    card,
    installments,
    hasTrade,
    tradeModel,
    tradeStorage,
    tradeColor,
    credit,
    imei,
    tradeNotes,
    deliveryMode,
    notes,
  } = fixture;
  return {
    whatsapp,
    base,
    payment,
    pix,
    card,
    installments,
    hasTrade,
    tradeModel,
    tradeStorage,
    tradeColor,
    credit,
    imei,
    tradeNotes,
    deliveryMode,
    notes,
    delivery: "standard",
    deadline: "",
    items: [
      {
        variantId: "variant-test-1",
        groupSlug: "ignored",
        product: "ignored",
        color: "ignored",
        storage: "ignored",
        condition: "Novo e lacrado",
        quantity: 2,
      },
    ],
  };
}
const submission = () => ({
  customer: fictitiousSheet().customer!,
  accepted: true,
});
function setup(
  repository = new UnitSheetRepository(),
  transport: CrmDeliveryTransport = new DisabledCrmDeliveryTransport(),
  renderer?: SheetRenderer,
) {
  const render = renderer || {
    version: "ficha-demo-unit-v1",
    render: jest.fn(async () => Buffer.from("%PDF-unit-ficticio")),
  };
  const catalog = {
    list: jest.fn(async () => [
      {
        id: "variant-test-1",
        model: "Modelo Central",
        product: "Modelo Central",
        category: "iPhones Novos",
        groupSlug: "modelo-central",
        color: "Prata",
        storage: "256GB",
        condition: "Novo e lacrado",
        image: "",
        crmMappingStatus: "confirmed" as const,
        crmSku: "SKU-TEST-1",
      },
    ]),
  };
  const seller = { ...demoSeller };
  return {
    repository,
    transport,
    renderer: render,
    catalog,
    seller,
    service: new SaleSheetService(
      repository,
      catalog,
      render,
      seller,
      transport,
    ),
  };
}
async function pending(set = setup()) {
  return {
    ...set,
    created: await set.service.create(actor, terms(), "creation-test-00001"),
  };
}
const hash = (v: string) => createHash("sha256").update(v).digest("hex");

describe("SaleSheetService isolated release", () => {
  describe("prazo máximo no cadastro público em America/Sao_Paulo", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-11-04T15:00:00.000Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("bloqueia o primeiro cadastro após vencer o prazo manual sem congelar dados nem preparar PDF/CRM", async () => {
      const send = jest.fn(async () => ({ status: 200 }));
      const p = setup(undefined, { mode: "datacrazy", send });
      const created = await p.service.create(
        actor,
        { ...terms(), delivery: "date", deadline: "2026-11-04" },
        "creation-test-00001",
      );
      const before = (await p.repository.get(created.sheet.id))!;
      jest.setSystemTime(new Date("2026-11-05T03:00:00.000Z"));

      const error = await p.service
        .submitPublic(created.token!, "submit-test-00001", submission())
        .catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error).toMatchObject({
        status: 400,
        message:
          "O prazo máximo de entrega desta ficha venceu. Entre em contato com a CompreFi para revisar a negociação e receber uma nova ficha.",
      });
      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: "delivery_deadline_expired",
      });
      expect(await p.repository.get(created.sheet.id)).toEqual(before);
      expect(before.revision).toBe(1);
      expect(before.customer).toBeUndefined();
      expect(before.submittedAt).toBeUndefined();
      expect(before.contractIssuedAt).toBeUndefined();
      expect(before.sellerSnapshot).toBeUndefined();
      expect(before.crmDelivery).toBeUndefined();
      expect(before.pdf).toEqual({ status: "waiting", attempts: 0 });
      expect(
        await p.repository.readDocument(created.sheet.id, before.revision),
      ).toBeUndefined();
      expect(p.renderer.render).not.toHaveBeenCalled();
      expect(send).not.toHaveBeenCalled();
    });

    it.each(["2026-11-04", "2026-11-06"])(
      "aceita o primeiro cadastro com prazo %s às 22h30 de Brasília, já no dia seguinte em UTC",
      async (deadline) => {
        const p = setup();
        const created = await p.service.create(
          actor,
          { ...terms(), delivery: "date", deadline },
          "creation-test-00001",
        );
        jest.setSystemTime(new Date("2026-11-05T01:30:00.000Z"));

        await expect(
          p.service.submitPublic(
            created.token!,
            "submit-test-00001",
            submission(),
          ),
        ).resolves.toMatchObject({
          submitted: true,
          revision: 2,
          pdfStatus: "ready",
        });
        const row = (await p.repository.get(created.sheet.id))!;
        expect(row.deadline).toBe(deadline);
        expect(row.contractIssuedAt).toBe("2026-11-05T01:30:00.000Z");
        expect(p.renderer.render).toHaveBeenCalledTimes(1);
      },
    );

    it("continua cadastrando entrega padrão com prazo vazio após a virada do dia", async () => {
      const p = await pending();
      jest.setSystemTime(new Date("2026-11-05T03:00:00.000Z"));

      await expect(
        p.service.submitPublic(
          p.created.token!,
          "submit-test-00001",
          submission(),
        ),
      ).resolves.toMatchObject({ submitted: true, pdfStatus: "ready" });
      expect(await p.repository.get(p.created.sheet.id)).toMatchObject({
        delivery: "standard",
        deadline: "",
        revision: 2,
      });
    });

    it("replay idempotente após o prazo preserva cadastro, emissão, revisão, checksum e bytes sem reenviar CRM", async () => {
      const send = jest.fn(async () => ({ status: 200 }));
      const p = setup(undefined, { mode: "datacrazy", send });
      const created = await p.service.create(
        actor,
        { ...terms(), delivery: "date", deadline: "2026-11-04" },
        "creation-test-00001",
      );
      const first = await p.service.submitPublic(
        created.token!,
        "submit-test-00001",
        submission(),
      );
      const frozen = (await p.repository.get(created.sheet.id))!;
      const document = await p.service.getContract(actor, created.sheet.id);
      expect(frozen.contractSha256).toBe(hash(document.buffer.toString()));
      jest.setSystemTime(new Date("2026-11-05T03:00:00.000Z"));
      p.seller.company = "Empresa Fictícia Alterada";
      p.renderer.version = "versao-ficticia-alterada";

      await expect(
        p.service.submitPublic(
          created.token!,
          "submit-test-00001",
          submission(),
        ),
      ).resolves.toEqual(first);
      expect(await p.repository.get(created.sheet.id)).toEqual(frozen);
      expect(await p.service.getContract(actor, created.sheet.id)).toEqual(
        document,
      );
      expect(p.renderer.render).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledTimes(1);
    });

    it("recupera PDF falhado após o prazo usando cadastro, vendedor e emissão do snapshot congelado", async () => {
      const render = jest.fn(
        async (_sheet: StoredSheet, _seller: SellerIdentity) =>
          Buffer.from("%PDF-recuperado-ficticio"),
      );
      render.mockRejectedValueOnce(new Error("falha fictícia de PDF"));
      const p = setup(undefined, undefined, {
        version: "versao-ficticia-original",
        render,
      });
      const created = await p.service.create(
        actor,
        { ...terms(), delivery: "date", deadline: "2026-11-04" },
        "creation-test-00001",
      );
      await expect(
        p.service.submitPublic(
          created.token!,
          "submit-test-00001",
          submission(),
        ),
      ).resolves.toMatchObject({ submitted: true, pdfStatus: "failed" });
      const frozen = (await p.repository.get(created.sheet.id))!;
      const { pdf: _pdf, ...snapshot } = frozen;
      jest.setSystemTime(new Date("2026-11-05T03:00:00.000Z"));
      p.seller.company = "Empresa Fictícia Alterada";
      p.renderer.version = "versao-ficticia-alterada";
      p.catalog.list.mockRejectedValue(
        new Error("catálogo não deve ser relido"),
      );

      await expect(
        p.service.retryContract(actor, created.sheet.id),
      ).resolves.toMatchObject({ pdf: { status: "ready", attempts: 2 } });
      expect(await p.repository.get(created.sheet.id)).toMatchObject(snapshot);
      expect(render).toHaveBeenCalledTimes(2);
      expect(render.mock.calls[1][0]).toMatchObject(snapshot);
      expect(render.mock.calls[1][1]).toEqual(frozen.sellerSnapshot);
      expect(p.catalog.list).toHaveBeenCalledTimes(1);
      expect(
        (await p.service.getContract(actor, created.sheet.id)).buffer,
      ).toEqual(Buffer.from("%PDF-recuperado-ficticio"));
    });
  });

  it("requires creation idempotency and concurrent creates commit exactly one sheet, raw token only once", async () => {
    const a = setup();
    const b = setup(a.repository);
    await expect(a.service.create(actor, terms(), undefined)).rejects.toThrow();
    const results = await Promise.all([
      a.service.create(actor, terms(), "creation-test-00001"),
      b.service.create(actor, terms(), "creation-test-00001"),
    ]);
    expect(a.repository.rows).toHaveLength(1);
    expect(results[0].sheet.id).toBe(results[1].sheet.id);
    expect(results.filter((v) => v.token)).toHaveLength(1);
    const raw = results.find((v) => v.token)!.token!;
    expect(Buffer.from(raw, "base64url")).toHaveLength(32);
    expect(a.repository.rows[0].tokenHash).toBe(hash(raw));
    expect(JSON.stringify(a.repository.rows)).not.toContain(raw);
    await expect(
      a.service.create(
        actor,
        { ...terms(), notes: "different" },
        "creation-test-00001",
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it("creation replay does not consult changed catalog or allocate another token", async () => {
    const p = await pending();
    p.catalog.list.mockRejectedValue(new Error("catalog changed"));
    const replay = await p.service.create(
      actor,
      terms(),
      "creation-test-00001",
    );
    expect(replay).toEqual({ sheet: p.created.sheet, replayed: true });
  });
  it("atomic submissions across service instances freeze customer, seller, template, revision and CRM payload", async () => {
    const p = await pending();
    const other = setup(p.repository);
    await Promise.all([
      p.service.submitPublic(
        p.created.token!,
        "submit-test-00001",
        submission(),
      ),
      other.service.submitPublic(
        p.created.token!,
        "submit-test-00001",
        submission(),
      ),
    ]);
    const frozen = (await p.repository.get(p.created.sheet.id))!;
    expect(frozen.revision).toBe(2);
    expect(frozen.pdf.status).toBe("ready");
    expect(frozen.sellerSnapshot).toEqual(demoSeller);
    expect(frozen.crmPayloadVersion).toBe("ficha-venda.v2-sku");
    expect(frozen.contractIssuedAt).toBe(frozen.submittedAt);
    expect(frozen.crmDelivery!.payloadHash).toBe(
      hash(frozen.crmDelivery!.payloadJson),
    );
    const before = await p.service.getContract(actor, frozen.id);
    p.seller.company = "Changed later";
    p.renderer.version = "changed-version";
    await p.service.submitPublic(
      p.created.token!,
      "submit-test-00001",
      submission(),
    );
    expect((await p.service.getContract(actor, frozen.id)).buffer).toEqual(
      before.buffer,
    );
    expect(await p.repository.get(frozen.id)).toEqual(frozen);
    await expect(
      p.service.submitPublic(p.created.token!, "submit-test-00001", {
        ...submission(),
        customer: { ...submission().customer, name: "Different Client" },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      p.service.submitPublic(
        p.created.token!,
        "submit-test-00002",
        submission(),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it("normalizes customer whitespace/CPF formatting before hashing the submit body", async () => {
    const p = await pending();
    await p.service.submitPublic(
      p.created.token!,
      "submit-test-00001",
      submission(),
    );
    const body = submission();
    body.customer.name = `  ${body.customer.name}  `;
    body.customer.cpf = body.customer.cpf.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      "$1.$2.$3-$4",
    );
    await expect(
      p.service.submitPublic(p.created.token!, "submit-test-00001", body),
    ).resolves.toMatchObject({ submitted: true });
  });
  it("owner boundaries and ADMIN-only CRM apply even to direct service calls", async () => {
    const p = await pending();
    const another = { ...actor, id: "another-sales" };
    expect(await p.service.listAdmin(another)).toEqual([]);
    await expect(
      p.service.getAdmin(another, p.created.sheet.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      p.service.rotateLink(another, p.created.sheet.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      p.service.crmPayload(actor, p.created.sheet.id),
    ).rejects.toThrow();
    expect(await p.service.listAdmin(admin)).toHaveLength(1);
  });
  it("public and admin projections exclude seller/token/leases; public also excludes customer/IMEI/SKU/private notes", async () => {
    const p = await pending();
    await p.service.submitPublic(
      p.created.token!,
      "submit-test-00001",
      submission(),
    );
    const publicView = await p.service.getPublic(p.created.token!);
    expect(publicView.submitted).toBe(true);
    expect(publicView.imei).toBe("");
    expect(publicView.tradeNotes).toBe("");
    expect(publicView.notes).toBe("");
    for (const field of [
      "customer",
      "createdBy",
      "sellerSnapshot",
      "tokenHash",
      "crmDelivery",
      "crmSku",
      "crmProductId",
      "crmMappingStatus",
      "leaseId",
      "contractSha256",
    ])
      expect(JSON.stringify(publicView)).not.toContain(`"${field}"`);
    const privateView = await p.service.getAdmin(actor, p.created.sheet.id);
    for (const field of [
      "sellerSnapshot",
      "tokenHash",
      "crmDelivery",
      "creationKeyHash",
      "creationBodyHash",
      "submissionKeyHash",
      "leaseId",
      "leaseUntil",
      "contractSha256",
    ])
      expect(JSON.stringify(privateView)).not.toContain(`"${field}"`);
  });
  it("link rotation invalidates old token; revocation and seven-day TTL invalidate public endpoints", async () => {
    const p = await pending();
    const rotated = await p.service.rotateLink(actor, p.created.sheet.id);
    await expect(p.service.getPublic(p.created.token!)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await p.service.revokeLink(actor, p.created.sheet.id);
    await expect(p.service.getPublic(rotated.token)).rejects.toThrow();
    const next = await p.service.create(actor, terms(), "creation-test-00002");
    await p.repository.transact((rows) => {
      rows.find((v) => v.id === next.sheet.id)!.linkExpiresAt = new Date(
        Date.now() - 1,
      ).toISOString();
    });
    await expect(
      p.service.submitPublic(next.token!, "submit-test-00001", submission()),
    ).rejects.toThrow();
  });
  it("PDF ready is immutable, read never regenerates, failed PDF has explicit retry and size cap", async () => {
    const render = jest.fn(async () => Buffer.alloc(MAX_CONTRACT_BYTES + 1));
    const p = await pending(
      setup(undefined, undefined, { version: "demo-test", render }),
    );
    expect(
      await p.service.submitPublic(
        p.created.token!,
        "submit-test-00001",
        submission(),
      ),
    ).toMatchObject({ pdfStatus: "failed", submitted: true });
    render.mockResolvedValue(Buffer.from("%PDF-recovered"));
    expect(
      await p.service.retryContract(actor, p.created.sheet.id),
    ).toMatchObject({ pdf: { status: "ready", attempts: 2 } });
    const pdf = await p.service.getContract(actor, p.created.sheet.id);
    await expect(
      p.service.retryContract(actor, p.created.sheet.id),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      (await p.service.getContract(actor, p.created.sheet.id)).buffer,
    ).toEqual(pdf.buffer);
    expect(render).toHaveBeenCalledTimes(2);
  });
  it("startup preserves live claims; expired PDF claims recover, expired CRM becomes uncertain without HTTP", async () => {
    const p = await pending();
    await p.service.submitPublic(
      p.created.token!,
      "submit-test-00001",
      submission(),
    );
    const send = jest.fn(async () => ({ status: 200 }));
    const restarted = setup(p.repository, { mode: "datacrazy", send });
    await p.repository.transact((rows) => {
      const row = rows[0];
      row.pdf = {
        status: "sending",
        attempts: 1,
        leaseId: "live",
        leaseUntil: new Date(Date.now() + 60000).toISOString(),
      };
      row.crm = {
        status: "sending",
        attempts: 1,
        deliveryMode: "datacrazy",
        leaseId: "live",
        leaseUntil: new Date(Date.now() + 60000).toISOString(),
      };
    });
    await restarted.service.onModuleInit();
    expect(send).not.toHaveBeenCalled();
    expect((await p.repository.get(p.created.sheet.id))!.pdf.leaseId).toBe(
      "live",
    );
    // Use new sheet with no document so recovery can create its version once.
    const waiting = await restarted.service.create(
      actor,
      terms(),
      "creation-test-00002",
    );
    await p.repository.transact((rows) => {
      const row = rows.find((r) => r.id === waiting.sheet.id)!;
      row.customer = submission().customer;
      row.submittedAt = new Date().toISOString();
      row.contractIssuedAt = row.submittedAt;
      row.sellerSnapshot = demoSeller;
      row.contractTemplateVersion = restarted.renderer.version;
      row.pdf = {
        status: "sending",
        attempts: 1,
        leaseId: "abandoned",
        leaseUntil: new Date(Date.now() - 1).toISOString(),
      };
      row.crm = {
        status: "sending",
        attempts: 1,
        deliveryMode: "datacrazy",
        leaseId: "abandoned",
        leaseUntil: new Date(Date.now() - 1).toISOString(),
      };
    });
    await restarted.service.onModuleInit();
    const recovered = (await p.repository.get(waiting.sheet.id))!;
    expect(recovered.pdf.status).toBe("ready");
    expect(recovered.crm.status).toBe("uncertain");
    expect(send).not.toHaveBeenCalled();
  });
  it("stale PDF completion fails CAS and cannot overwrite a recovered READY document", async () => {
    let release: (value: Buffer) => void;
    const blocked = jest.fn(
      () =>
        new Promise<Buffer>((resolve) => {
          release = resolve;
        }),
    );
    const p = await pending(
      setup(undefined, undefined, { version: "demo-test", render: blocked }),
    );
    const submitting = p.service.submitPublic(
      p.created.token!,
      "submit-test-00001",
      submission(),
    );
    for (let i = 0; i < 30 && !release; i++)
      await new Promise((resolve) => setImmediate(resolve));
    expect(release).toBeDefined();
    await p.repository.transact((rows) => {
      rows[0].pdf.leaseUntil = new Date(Date.now() - 1).toISOString();
    });
    const recovery = setup(p.repository, undefined, {
      version: "demo-test",
      render: async () => Buffer.from("%PDF-winning-recovery"),
    });
    await recovery.service.onModuleInit();
    release(Buffer.from("%PDF-stale-finisher"));
    await submitting;
    expect(
      (
        await p.service.getContract(actor, p.created.sheet.id)
      ).buffer.toString(),
    ).toBe("%PDF-winning-recovery");
  });
  it.each([503, 302, 0])(
    "CRM status %s is uncertain, PDF succeeds, remote attempt occurs once and retries blocked",
    async (status) => {
      const send = jest.fn(async () => ({ status }));
      const p = await pending(setup(undefined, { mode: "datacrazy", send }));
      expect(
        await p.service.submitPublic(
          p.created.token!,
          "submit-test-00001",
          submission(),
        ),
      ).toMatchObject({ pdfStatus: "ready", crmStatus: "uncertain" });
      expect(send).toHaveBeenCalledTimes(1);
      expect((await p.repository.get(p.created.sheet.id))!.crm.attempts).toBe(
        1,
      );
      await expect(
        p.service.retryCrm(admin, p.created.sheet.id),
      ).rejects.toBeInstanceOf(ConflictException);
      await p.service.onModuleInit();
      await p.service.submitPublic(
        p.created.token!,
        "submit-test-00001",
        submission(),
      );
      expect(send).toHaveBeenCalledTimes(1);
    },
  );
  it("CRM timeout is uncertain; attempt and payload are durably stored before send", async () => {
    const repository = new UnitSheetRepository();
    const send = jest.fn(async () => {
      const row = repository.rows[0];
      expect(row.crm.status).toBe("sending");
      expect(row.crm.attempts).toBe(1);
      expect(row.crmDelivery!.attemptedAt).toBeTruthy();
      throw new Error("timeout");
    });
    const p = await pending(setup(repository, { mode: "datacrazy", send }));
    expect(
      await p.service.submitPublic(
        p.created.token!,
        "submit-test-00001",
        submission(),
      ),
    ).toMatchObject({ crmStatus: "uncertain", pdfStatus: "ready" });
  });
  it("manual item or unconfigured SKU blocks CRM preparation but not cadastro/PDF", async () => {
    const p = setup(undefined, {
      mode: "datacrazy",
      send: jest.fn(async () => ({ status: 200 })),
    });
    const body = terms();
    body.items[0].variantId = null;
    const created = await p.service.create(actor, body, "creation-test-00001");
    expect(
      await p.service.submitPublic(
        created.token!,
        "submit-test-00001",
        submission(),
      ),
    ).toMatchObject({ pdfStatus: "ready", crmStatus: "failed" });
    expect(p.transport.send).not.toHaveBeenCalled();
    await expect(
      p.service.crmPayload(admin, created.sheet.id),
    ).rejects.toThrow();
  });
});
