import { Test } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  UnauthorizedException,
  ExecutionContext,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import * as request from "supertest";
import { SaleSheetController } from "../src/modules/sale-sheet/sale-sheet.controller";
import { SaleSheetService } from "../src/modules/sale-sheet/sale-sheet.service";
import { PostgresSheetRepository } from "../src/modules/sale-sheet/postgres.repository";
import { PrismaService } from "../src/database/prisma.service";
import { JwtAuthGuard } from "../src/modules/auth/jwt-auth.guard";
import { CurrentSheetUserGuard } from "../src/modules/sale-sheet/current-sheet-user.guard";
import {
  SheetActor,
  StoredSheet,
} from "../src/modules/sale-sheet/sale-sheet.types";
import {
  fictitiousCustomer,
  fictitiousTerms,
} from "../src/modules/sale-sheet/contract/fixtures";
import { demoSeller } from "../src/modules/sale-sheet/contract/seller";

const actors: Record<string, SheetActor> = {
  sales: {
    id: "completion-pg-sales-fake",
    name: "Operador Fictício PG",
    email: "sales@example.test",
    role: "SALES",
  },
  admin: {
    id: "completion-pg-admin-fake",
    name: "Admin Fictício PG",
    email: "admin@example.test",
    role: "ADMIN",
  },
  other: {
    id: "completion-pg-other-fake",
    name: "Outro Fictício PG",
    email: "other@example.test",
    role: "SALES",
  },
};
const submission = () => ({ accepted: true, customer: fictitiousCustomer });
const timestamp = "2026-11-12T15:00:00.000Z";
const base = (id: string) => `/ficha-venda/admin/${id}`;
const legacy = (id: string) => `/ficha-venda/admin/${id}`;

describe("HTTP + PostgreSQL descartável: Finalizados", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let replica: PrismaClient;
  let service: SaleSheetService;
  let second: SaleSheetService;
  let sequence = 0;
  const render = jest.fn(async () => Buffer.from("%PDF-completion-PG-fake"));
  const send = jest.fn(async () => ({ status: 200 }));
  const catalog = { list: jest.fn(async () => []) };
  const transport = { mode: "datacrazy" as const, send };
  const authorized = (path: string, actor = "sales") =>
    request(app.getHttpServer()).post(path).set("x-test-actor", actor);
  const get = (path: string) =>
    request(app.getHttpServer()).get(path).set("x-test-actor", "sales");
  const makeService = (client: PrismaClient) =>
    new SaleSheetService(
      new PostgresSheetRepository(client as PrismaService),
      catalog,
      { version: "completion-pg-fake", render },
      demoSeller,
      transport,
    );
  async function create(respond = true) {
    const created = await service.create(
      actors.sales,
      fictitiousTerms(),
      `completion-pg-create-${++sequence}`,
    );
    const id = created.sheet.id;
    // Confirmed fake mapping enables a frozen CRM payload without real catalog/CRM.
    if (respond) {
      await new PostgresSheetRepository(prisma as PrismaService).transact(
        (rows) => {
          const row = rows.find((sheet) => sheet.id === id)!;
          row.items = row.items.map((item) => ({
            ...item,
            crmMappingStatus: "confirmed",
            crmSku: "SKU-COMPLETION-FAKE",
          }));
        },
      );
      await service.submitPublic(
        created.token!,
        `completion-pg-submit-${sequence}`,
        submission(),
      );
    }
    return { id, created };
  }
  const row = (id: string) =>
    prisma.saleSheet.findUniqueOrThrow({ where: { id } });
  const actions = async (id: string) =>
    (await prisma.saleSheetEvent.findMany({ where: { sheetId: id } })).map(
      (event) => event.action,
    );
  beforeAll(async () => {
    if (
      process.env.NODE_ENV !== "test" ||
      !process.env.FICHA_TEST_DATABASE_URL?.startsWith(
        "postgresql://ubuntu@127.0.0.1:",
      )
    )
      throw new Error("isolated synthetic DSN required");
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.FICHA_TEST_DATABASE_URL } },
    });
    replica = new PrismaClient({
      datasources: { db: { url: process.env.FICHA_TEST_DATABASE_URL } },
    });
    await Promise.all([prisma.$connect(), replica.$connect()]);
    for (const actor of Object.values(actors))
      await prisma.$executeRaw`INSERT INTO "users" (id, name, email, role) VALUES (${actor.id}, ${actor.name}, ${actor.email}, ${actor.role}::"UserRole")`;
    service = makeService(prisma);
    second = makeService(replica);
    const module = await Test.createTestingModule({
      controllers: [SaleSheetController],
      providers: [
        { provide: SaleSheetService, useValue: service },
        { provide: PrismaService, useValue: prisma },
        CurrentSheetUserGuard,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest<{
            headers: Record<string, string>;
            user?: SheetActor;
          }>();
          const actor =
            req.headers["x-test-actor"] === "invalidrole"
              ? { ...actors.sales, role: "OTHER" as never }
              : actors[req.headers["x-test-actor"]];
          if (!actor) throw new UnauthorizedException();
          req.user = { ...actor };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication({ logger: false });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  }, 30000);
  afterAll(async () => {
    await app?.close();
    await Promise.all([prisma?.$disconnect(), replica?.$disconnect()]);
  });

  it("contrato namespace publicado HTTP 200, admin DTO, histórico privado, sem novo PDF/CRM/public PII", async () => {
    const p = await create();
    const before = await row(p.id);
    expect(before.snapshot).not.toHaveProperty("finalizedAt");
    const document = await prisma.saleSheetDocument.findUniqueOrThrow({
      where: { sheetId_revision: { sheetId: p.id, revision: 2 } },
    });
    const publicBefore = await request(app.getHttpServer())
      .get(`/ficha-venda/public/${p.created.token}`)
      .expect(200);
    const sent = send.mock.calls.length;
    const renders = render.mock.calls.length;
    const finalized = await authorized(`${base(p.id)}/finalize`, "admin")
      .send({ expectedVersion: 2 })
      .expect(200);
    expect(finalized.body).toMatchObject({
      revision: 3,
      finalizedById: actors.admin.id,
      finalizedByName: actors.admin.name,
    });
    expect(finalized.body).not.toHaveProperty("sheet");
    expect(finalized.body).not.toHaveProperty("token");
    expect(finalized.headers["cache-control"]).toBe(
      "private, no-store, max-age=0",
    );
    expect(finalized.headers["pragma"]).toBe("no-cache");
    expect(finalized.headers["referrer-policy"]).toBe("no-referrer");
    const persisted = (await row(p.id)).snapshot as unknown as StoredSheet;
    expect(persisted.revision).toBe(2);
    expect(persisted.operationalHistory).toMatchObject([
      {
        action: "finalize",
        actorId: actors.admin.id,
        actorName: actors.admin.name,
        at: finalized.body.finalizedAt,
        expectedVersion: 2,
        resultVersion: 3,
      },
    ]);
    expect(JSON.stringify(finalized.body)).not.toMatch(
      /operationalHistory|operationalVersion/,
    );
    const archived = await authorized(`${legacy(p.id)}/archive`)
      .send({ revision: 3 })
      .expect(200);
    expect(archived.body.finalizedAt).toBe(finalized.body.finalizedAt);
    const unarchived = await authorized(`${legacy(p.id)}/unarchive`)
      .send({ revision: 3, archivedAt: archived.body.archivedAt })
      .expect(200);
    expect(unarchived.body.finalizedAt).toBe(finalized.body.finalizedAt);
    const reopened = await authorized(`${legacy(p.id)}/reopen`)
      .send({
        expectedVersion: 3,
        expectedFinalizedAt: finalized.body.finalizedAt,
      })
      .expect(200);
    expect(reopened.body).toMatchObject({
      revision: 4,
      finalizedAt: null,
      finalizedById: null,
      finalizedByName: null,
    });
    const after = await row(p.id);
    const {
      operationalVersion: _version,
      operationalHistory: _history,
      ...snapshot
    } = after.snapshot as unknown as StoredSheet;
    expect(snapshot).toEqual(before.snapshot);
    const { snapshot: _bs, updatedAt: _bu, ...beforeColumns } = before;
    const { snapshot: _as, updatedAt: _au, ...afterColumns } = after;
    expect(afterColumns).toEqual(beforeColumns);
    expect(
      await prisma.saleSheetDocument.findUniqueOrThrow({
        where: { sheetId_revision: { sheetId: p.id, revision: 2 } },
      }),
    ).toEqual(document);
    expect(
      Buffer.from((await get(`${legacy(p.id)}/contract`).expect(200)).body),
    ).toEqual(Buffer.from(document.bytes));
    const publicAfter = await request(app.getHttpServer())
      .get(`/ficha-venda/public/${p.created.token}`)
      .expect(200);
    expect(publicAfter.body).toEqual(publicBefore.body);
    expect(JSON.stringify(publicAfter.body)).not.toMatch(
      /finalized|operational|completion-pg-admin/,
    );
    expect((after.snapshot as unknown as StoredSheet).crmDelivery).toEqual(
      (before.snapshot as unknown as StoredSheet).crmDelivery,
    );
    await request(app.getHttpServer())
      .patch(legacy(p.id))
      .set("x-test-actor", "sales")
      .set("Idempotency-Key", "completion-pg-edit")
      .send({ revision: 4, terms: fictitiousTerms() })
      .expect(409);
    await authorized(`${legacy(p.id)}/link`).expect(409);
    expect(send).toHaveBeenCalledTimes(sent);
    expect(render).toHaveBeenCalledTimes(renders);
    const history = (await actions(p.id)).filter((action) =>
      /^(finalize|reopen):/.test(action),
    );
    expect(history.sort()).toEqual([
      "finalize:expected=2;result=3",
      "reopen:expected=3;result=4",
    ]);
    expect(JSON.stringify(history)).not.toMatch(
      /@|Fictício|finalizedAt|actorId|customer|token/,
    );
  });

  it("namespace extra não é exposto; retry explícito após reabrir mantém documento na revisão contratual", async () => {
    const p = await create();
    await authorized(`/sale-sheets/${p.id}/finalize`)
      .send({ expectedVersion: 2 })
      .expect(404);
    await authorized(`/sale-sheets/${p.id}/reopen`)
      .send({ expectedVersion: 2, expectedFinalizedAt: timestamp })
      .expect(404);
    const fresh = await service.create(
      actors.sales,
      fictitiousTerms(),
      `completion-pg-create-${++sequence}`,
    );
    const id = fresh.sheet.id;
    render.mockRejectedValueOnce(new Error("falha fictícia"));
    await service.submitPublic(
      fresh.token!,
      `completion-pg-submit-${sequence}`,
      submission(),
    );
    const finalized = await authorized(`${base(id)}/finalize`)
      .send({ expectedVersion: 2 })
      .expect(200);
    await authorized(`${base(id)}/reopen`)
      .send({
        expectedVersion: 3,
        expectedFinalizedAt: finalized.body.finalizedAt,
      })
      .expect(200);
    const recovered = await authorized(`${legacy(id)}/contract/retry`).expect(
      201,
    );
    expect(recovered.body).toMatchObject({
      revision: 4,
      pdf: { status: "ready" },
      finalizedAt: null,
    });
    expect((await row(id)).revision).toBe(2);
    expect(
      await prisma.saleSheetDocument.count({
        where: { sheetId: id, revision: 2 },
      }),
    ).toBe(1);
    expect(
      await prisma.saleSheetDocument.count({
        where: { sheetId: id, revision: 4 },
      }),
    ).toBe(0);
    expect(
      (await authorized(`${legacy(id)}/crm/retry`, "admin").expect(201)).body,
    ).toMatchObject({ revision: 4, crm: { status: "failed" } });
    await authorized(`${legacy(id)}/link`).expect(409);
    await authorized(`${legacy(id)}/contract/retry`).expect(409);
  });

  it("duplicações por HTTP e conexões independentes gravam uma transição/evento por ação", async () => {
    const p = await create();
    const results = await Promise.all([
      authorized(`${base(p.id)}/finalize`)
        .send({ expectedVersion: 2 })
        .expect(200),
      authorized(`${legacy(p.id)}/finalize`, "admin")
        .send({ expectedVersion: 2 })
        .expect(200),
      second.finalize(actors.sales, p.id, { expectedVersion: 2 }),
    ]);
    expect(results[0].body).toEqual(results[1].body);
    expect(results[0].body).toEqual(results[2]);
    const finalizedRow = await row(p.id);
    expect(
      await second.finalize(actors.admin, p.id, { expectedVersion: 3 }),
    ).toEqual(results[0].body);
    expect(await row(p.id)).toEqual(finalizedRow);
    const body = {
      expectedVersion: 3,
      expectedFinalizedAt: results[0].body.finalizedAt,
    };
    const reopens = await Promise.all([
      authorized(`${base(p.id)}/reopen`)
        .send(body)
        .expect(200),
      second.reopen(actors.admin, p.id, body),
    ]);
    expect(reopens[0].body).toEqual(reopens[1]);
    const reopenedRow = await row(p.id);
    expect(await makeService(replica).reopen(actors.sales, p.id, body)).toEqual(
      reopens[0].body,
    );
    expect(await row(p.id)).toEqual(reopenedRow);
    expect(
      (await actions(p.id))
        .filter((action) => /^(finalize|reopen):/.test(action))
        .sort(),
    ).toEqual(["finalize:expected=2;result=3", "reopen:expected=3;result=4"]);
    expect(
      (reopenedRow.snapshot as unknown as StoredSheet).operationalHistory,
    ).toHaveLength(2);
  });

  it("ciclo novo rejeita finalize/reopen atrasados com CAS, timestamp exato e sem escrita", async () => {
    const p = await create();
    const first = await second.finalize(actors.sales, p.id, {
      expectedVersion: 2,
    });
    const oldBody = {
      expectedVersion: 3,
      expectedFinalizedAt: first.finalizedAt,
    };
    await second.reopen(actors.sales, p.id, oldBody);
    await authorized(`${base(p.id)}/finalize`)
      .send({ expectedVersion: 2 })
      .expect(409);
    const next = await service.finalize(actors.admin, p.id, {
      expectedVersion: 4,
    });
    expect(next.finalizedAt).not.toBe(first.finalizedAt);
    const before = await row(p.id);
    const history = await actions(p.id);
    await authorized(`${base(p.id)}/reopen`)
      .send(oldBody)
      .expect(409);
    await authorized(`${base(p.id)}/reopen`)
      .send({ expectedVersion: 5, expectedFinalizedAt: first.finalizedAt })
      .expect(409);
    await authorized(`${base(p.id)}/finalize`)
      .send({ expectedVersion: 2 })
      .expect(409);
    expect(await row(p.id)).toEqual(before);
    expect(await actions(p.id)).toEqual(history);
  });

  it.each(["finalize", "reopen"])(
    "guards reais: JWT, SALES own, ADMIN all, role atualizado (%s)",
    async (action) => {
      const p = await create();
      const body =
        action === "finalize"
          ? { expectedVersion: 2 }
          : {
              expectedVersion: 3,
              expectedFinalizedAt: (
                await service.finalize(actors.sales, p.id, {
                  expectedVersion: 2,
                })
              ).finalizedAt,
            };
      const before = await row(p.id);
      const events = await actions(p.id);
      await request(app.getHttpServer())
        .post(`${base(p.id)}/${action}`)
        .send(body)
        .expect(401);
      await authorized(`${base(p.id)}/${action}`, "other")
        .send(body)
        .expect(404);
      await authorized(`${legacy(p.id)}/${action}`, "invalidrole")
        .send(body)
        .expect(403);
      await prisma.$executeRaw`UPDATE "users" SET "role" = 'SALES'::"UserRole" WHERE id = ${actors.admin.id}`;
      try {
        await authorized(`${base(p.id)}/${action}`, "admin")
          .send(body)
          .expect(403);
      } finally {
        await prisma.$executeRaw`UPDATE "users" SET "role" = 'ADMIN'::"UserRole" WHERE id = ${actors.admin.id}`;
      }
      expect(await row(p.id)).toEqual(before);
      expect(await actions(p.id)).toEqual(events);
      await authorized(`${base(p.id)}/${action}`, "admin")
        .send(body)
        .expect(200);
    },
  );

  it.each([
    {},
    { revision: 2 },
    { expectedVersion: "2" },
    { expectedVersion: 0 },
    { expectedVersion: 2.5 },
    { expectedVersion: 2147483648 },
    { expectedVersion: 2, finalizedByName: "injected" },
  ])("DTO finalize estrito (%j)", async (body) => {
    const p = await create();
    const before = await row(p.id);
    const result = await authorized(`${base(p.id)}/finalize`)
      .send(body)
      .expect(400);
    expect(result.body.message).toBe(
      "Dados inválidos. Confira a versão do pedido.",
    );
    expect(await row(p.id)).toEqual(before);
  });
  it.each([
    {},
    { expectedVersion: 3 },
    { expectedVersion: 3, expectedFinalizedAt: null },
    { expectedVersion: 3, expectedFinalizedAt: "2026-11-12T15:00:00Z" },
    { expectedVersion: 3, expectedFinalizedAt: "2026-02-30T15:00:00.000Z" },
    { expectedVersion: 3, expectedFinalizedAt: timestamp, revoked: false },
  ])(
    "DTO reopen exige timestamp e proíbe propriedades extras (%j)",
    async (body) => {
      const p = await create();
      await service.finalize(actors.sales, p.id, { expectedVersion: 2 });
      const before = await row(p.id);
      const result = await authorized(`${base(p.id)}/reopen`)
        .send(body)
        .expect(400);
      expect(result.body.message).toBe(
        "Dados inválidos. Confira a versão e a data de finalização do pedido.",
      );
      expect(await row(p.id)).toEqual(before);
    },
  );

  it("pendente/cancelado/arquivado não finalizam; reabrir legado revogado nunca reativa link", async () => {
    const pending = await create(false);
    await authorized(`${base(pending.id)}/finalize`)
      .send({ expectedVersion: 1 })
      .expect(409);
    await service.cancel(actors.sales, pending.id, { revision: 1 });
    await authorized(`${base(pending.id)}/finalize`)
      .send({ expectedVersion: 2 })
      .expect(409);
    const p = await create();
    await service.archive(actors.sales, p.id, { revision: 2 });
    await authorized(`${base(p.id)}/finalize`)
      .send({ expectedVersion: 2 })
      .expect(409);
    await new PostgresSheetRepository(prisma as PrismaService).transact(
      (rows) => {
        const sheet = rows.find((entry) => entry.id === p.id)!;
        sheet.finalizedAt = timestamp;
        sheet.revoked = true;
      },
    );
    const result = await authorized(`${base(p.id)}/reopen`)
      .send({ expectedVersion: 2, expectedFinalizedAt: timestamp })
      .expect(200);
    expect(result.body).toMatchObject({
      finalizedAt: null,
      revoked: true,
      revision: 3,
    });
    expect(result.body.archivedAt).toBeTruthy();
    await request(app.getHttpServer())
      .get(`/ficha-venda/public/${p.created.token}`)
      .expect(410);
    await authorized(`${legacy(p.id)}/link`).expect(409);
  });

  it.each(["archive", "finalize"])(
    "disputa archive × finalize: %s obtém primeiro lock, sem last-writer-wins",
    async (winner) => {
      const p = await create();
      const repository = new PostgresSheetRepository(prisma as PrismaService);
      const original = repository.transact.bind(repository);
      let entered!: () => void;
      const start = new Promise<void>((resolve) => {
        entered = resolve;
      });
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      repository.transact = (fn) =>
        original(async (rows, docs) => {
          entered();
          await gate;
          return fn(rows, docs);
        });
      const firstService = new SaleSheetService(
        repository,
        catalog,
        { version: "completion-pg-fake", render },
        demoSeller,
        transport,
      );
      const first =
        winner === "archive"
          ? firstService.archive(actors.sales, p.id, { revision: 2 })
          : firstService.finalize(actors.sales, p.id, { expectedVersion: 2 });
      await start;
      const competing =
        winner === "archive"
          ? second.finalize(actors.admin, p.id, { expectedVersion: 2 })
          : second.archive(actors.admin, p.id, { revision: 2 });
      const outcomes = Promise.allSettled([first, competing]);
      release();
      const results = await outcomes;
      expect(results[0].status).toBe("fulfilled");
      expect(results[1].status).toBe("rejected");
      expect((results[1] as PromiseRejectedResult).reason.getStatus()).toBe(
        409,
      );
      const snapshot = (await row(p.id)).snapshot as unknown as StoredSheet;
      if (winner === "archive") {
        expect(snapshot.archivedAt).toBeTruthy();
        expect(snapshot.finalizedAt).toBeUndefined();
      } else {
        expect(snapshot.archivedAt).toBeUndefined();
        expect(snapshot.finalizedAt).toBeTruthy();
      }
      expect(snapshot.revision).toBe(2);
    },
  );
});
