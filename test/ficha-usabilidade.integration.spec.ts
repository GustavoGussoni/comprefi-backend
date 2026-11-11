import { Test } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  UnauthorizedException,
  ExecutionContext,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import * as request from "supertest";
import { createServer, Server } from "node:http";
import { createHash } from "node:crypto";
import { SaleSheetController } from "../src/modules/sale-sheet/sale-sheet.controller";
import { SaleSheetService } from "../src/modules/sale-sheet/sale-sheet.service";
import { PostgresSheetRepository } from "../src/modules/sale-sheet/postgres.repository";
import { PrismaService } from "../src/database/prisma.service";
import { JwtAuthGuard } from "../src/modules/auth/jwt-auth.guard";
import { CurrentSheetUserGuard } from "../src/modules/sale-sheet/current-sheet-user.guard";
import {
  SHEET_CATALOG,
  SHEET_CRM_DELIVERY,
  SHEET_RENDERER,
  SHEET_REPOSITORY,
  SHEET_SELLER,
  SheetActor,
  StoredSheet,
  SheetSnapshot,
} from "../src/modules/sale-sheet/sale-sheet.types";
import {
  fictitiousCustomer,
  fictitiousTerms,
} from "../src/modules/sale-sheet/contract/fixtures";
import { demoSeller } from "../src/modules/sale-sheet/contract/seller";

const actors: Record<string, SheetActor> = {
  sales: {
    id: "sales-fake-pg",
    name: "Vendas Fictícias",
    email: "sales@example.test",
    role: "SALES",
  },
  admin: {
    id: "admin-fake-pg",
    name: "Admin Fictício",
    email: "admin@example.test",
    role: "ADMIN",
  },
  other: {
    id: "other-fake-pg",
    name: "Outro Fictício",
    email: "other@example.test",
    role: "SALES",
  },
};
const terms = () => ({
  ...fictitiousTerms(),
  items: [
    {
      variantId: "variant-pg-fake",
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
const catalog = {
  list: async () => [
    {
      id: "variant-pg-fake",
      product: "Produto Fictício PG",
      model: "Modelo Fictício",
      category: "Teste",
      groupSlug: "teste",
      color: "Prata",
      storage: "256GB",
      condition: "Novo e lacrado",
      image: "",
      crmMappingStatus: "confirmed" as const,
      crmSku: "SKU-PG-FAKE",
    },
  ],
};

describe("HTTP + PostgreSQL 17 descartável: ficha usabilidade", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let secondPrisma: PrismaClient;
  let service: SaleSheetService;
  let second: SaleSheetService;
  let mock: Server;
  let mockUrl: string;
  let requests = 0;
  let sequence = 0;
  const render = jest.fn(async () => Buffer.from("%PDF-PG-INTEGRATION-FAKE"));
  const transport = {
    mode: "datacrazy" as const,
    send: async (json: string, key: string) => {
      const response = await fetch(mockUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: json,
      });
      return { status: response.status };
    },
  };
  const authorized = (
    method: "get" | "post" | "patch",
    path: string,
    actor = "sales",
  ) => request(app.getHttpServer())[method](path).set("x-test-actor", actor);
  async function create() {
    sequence += 1;
    const response = await authorized("post", "/ficha-venda/admin")
      .set("Idempotency-Key", `integration-create-${sequence}`)
      .send(terms())
      .expect(201);
    return response.body as {
      sheet: { id: string; revision: number };
      token: string;
    };
  }
  const base = (id: string) => `/ficha-venda/admin/${id}`;
  beforeAll(async () => {
    // An explicit synthetic DSN is mandatory; no envfiles/AppModule are loaded.
    if (
      process.env.NODE_ENV !== "test" ||
      !process.env.FICHA_TEST_DATABASE_URL?.startsWith(
        "postgresql://ubuntu@127.0.0.1:",
      )
    )
      throw new Error("isolated test DSN required");
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.FICHA_TEST_DATABASE_URL } },
    });
    secondPrisma = new PrismaClient({
      datasources: { db: { url: process.env.FICHA_TEST_DATABASE_URL } },
    });
    await Promise.all([prisma.$connect(), secondPrisma.$connect()]);
    for (const actor of Object.values(actors))
      await prisma.$executeRaw`INSERT INTO "users" (id, name, email, role) VALUES (${actor.id}, ${actor.name}, ${actor.email}, ${actor.role}::"UserRole")`;
    mock = createServer((req, res) => {
      req.resume();
      req.on("end", () => {
        requests += 1;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end('{"accepted":true}');
      });
    });
    await new Promise<void>((resolve) => mock.listen(0, "127.0.0.1", resolve));
    mockUrl = `http://127.0.0.1:${(mock.address() as { port: number }).port}/crm-fake`;
    const repository = new PostgresSheetRepository(prisma as PrismaService);
    service = new SaleSheetService(
      repository,
      catalog,
      { version: "integration-fake-v1", render },
      demoSeller,
      transport,
    );
    second = new SaleSheetService(
      new PostgresSheetRepository(secondPrisma as PrismaService),
      catalog,
      { version: "integration-fake-v1", render },
      demoSeller,
      transport,
    );
    const module = await Test.createTestingModule({
      controllers: [SaleSheetController],
      providers: [
        { provide: SaleSheetService, useValue: service },
        { provide: PrismaService, useValue: prisma },
        CurrentSheetUserGuard,
        { provide: SHEET_REPOSITORY, useValue: repository },
        { provide: SHEET_CATALOG, useValue: catalog },
        {
          provide: SHEET_RENDERER,
          useValue: { version: "integration-fake-v1", render },
        },
        { provide: SHEET_SELLER, useValue: demoSeller },
        { provide: SHEET_CRM_DELIVERY, useValue: transport },
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
          if (!actor)
            throw new UnauthorizedException(
              "Autenticação de teste obrigatória.",
            );
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
    if (mock) await new Promise<void>((resolve) => mock.close(() => resolve()));
    await Promise.all([prisma?.$disconnect(), secondPrisma?.$disconnect()]);
  });

  it("PATCH exato autentica, valida PTBR, troca token e persiste replay entre conexões", async () => {
    const created = await create();
    const id = created.sheet.id;
    const body = {
      revision: 1,
      terms: { ...terms(), notes: "Edição fictícia" },
    };
    const old = await prisma.saleSheet.findUniqueOrThrow({ where: { id } });
    const count = requests;
    await request(app.getHttpServer()).patch(base(id)).send(body).expect(401);
    await authorized("patch", base(id), "other")
      .set("Idempotency-Key", "integration-edit-0001")
      .send(body)
      .expect(404);
    const invalid = await authorized("patch", base(id))
      .set("Idempotency-Key", "integration-edit-0001")
      .send({ revision: "1", terms: terms() })
      .expect(400);
    expect(invalid.body.message).toBe(
      "Dados inválidos. Confira a revisão e os dados informados.",
    );
    await authorized("patch", base(id)).send(body).expect(400);
    const edited = await authorized("patch", base(id))
      .set("Idempotency-Key", "integration-edit-0001")
      .send(body)
      .expect(200);
    expect(edited.body).toMatchObject({
      replayed: false,
      sheet: { revision: 2 },
    });
    expect(edited.headers["cache-control"]).toBe(
      "private, no-store, max-age=0",
    );
    expect(
      await second.edit(actors.sales, id, body, "integration-edit-0001"),
    ).toEqual({ replayed: true, sheet: edited.body.sheet });
    await authorized("patch", base(id))
      .set("Idempotency-Key", "integration-edit-0001")
      .send({ ...body, terms: terms() })
      .expect(409);
    await request(app.getHttpServer())
      .get(`/ficha-venda/public/${created.token}`)
      .expect(404);
    await request(app.getHttpServer())
      .post(`/ficha-venda/public/${created.token}`)
      .set("Idempotency-Key", "integration-submit-0001")
      .send(submission())
      .expect(404);
    await request(app.getHttpServer())
      .get(`/ficha-venda/public/${edited.body.token}`)
      .expect(200);
    const row = await prisma.saleSheet.findUniqueOrThrow({ where: { id } });
    expect(row.tokenHash).toBe(hash(edited.body.token));
    expect(row.creationKeyHash).toBe(old.creationKeyHash);
    expect(row.creationBodyHash).toBe(old.creationBodyHash);
    expect(JSON.stringify(row.snapshot)).not.toContain(edited.body.token);
    const events = await prisma.saleSheetEvent.findMany({
      where: { sheetId: id },
    });
    expect(events.map((event) => event.action).sort()).toEqual(
      ["created", "edit:expected=1;result=2"].sort(),
    );
    expect(requests).toBe(count);
    expect(
      await prisma.saleSheetDocument.count({ where: { sheetId: id } }),
    ).toBe(0);
  });

  it("duplicate edits persistem uma operação/evento/token com advisory lock entre clientes", async () => {
    const created = await create();
    const body = { revision: 1, terms: terms() };
    const results = await Promise.all([
      service.edit(
        actors.sales,
        created.sheet.id,
        body,
        "integration-duplicate-edit",
      ),
      second.edit(
        actors.sales,
        created.sheet.id,
        body,
        "integration-duplicate-edit",
      ),
    ]);
    expect(results.filter((value) => value.token)).toHaveLength(1);
    expect(results.filter((value) => value.replayed)).toHaveLength(1);
    expect(
      await prisma.saleSheetEvent.count({
        where: { sheetId: created.sheet.id },
      }),
    ).toBe(2);
    expect(
      (
        await prisma.saleSheet.findUniqueOrThrow({
          where: { id: created.sheet.id },
        })
      ).revision,
    ).toBe(2);
  });

  it("edit × edit com chaves diferentes não sofre last-writer-wins", async () => {
    const created = await create();
    const id = created.sheet.id;
    const results = await Promise.allSettled([
      service.edit(
        actors.sales,
        id,
        { revision: 1, terms: terms() },
        "integration-competing-edit-1",
      ),
      second.edit(
        actors.sales,
        id,
        { revision: 1, terms: { ...terms(), notes: "concorrente" } },
        "integration-competing-edit-2",
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
      ).reason.getStatus(),
    ).toBe(409);
    expect(await prisma.saleSheetEvent.count({ where: { sheetId: id } })).toBe(
      2,
    );
  });

  it.each(["edit", "submit"])(
    "edit × submit: %s primeiro lock, sem mistura de cadastro/negociação",
    async (winner) => {
      const created = await create();
      const id = created.sheet.id;
      // Hold the first repository transaction until the competing operation queues.
      const repository = new PostgresSheetRepository(prisma as PrismaService);
      const original = repository.transact.bind(repository);
      let entered!: () => void;
      const enteredPromise = new Promise<void>((resolve) => {
        entered = resolve;
      });
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      let first = true;
      repository.transact = async (fn) =>
        original(async (rows, docs) => {
          if (first) {
            first = false;
            entered();
            await gate;
          }
          return fn(rows, docs);
        });
      const a = new SaleSheetService(
        repository,
        catalog,
        { version: "integration-fake-v1", render },
        demoSeller,
        transport,
      );
      const count = requests;
      const edit = (target: SaleSheetService) =>
        target.edit(
          actors.sales,
          id,
          { revision: 1, terms: { ...terms(), notes: "vencedora" } },
          "integration-edit-submit",
        );
      const submit = (target: SaleSheetService) =>
        target.submitPublic(
          created.token,
          "integration-submit-race",
          submission(),
        );
      const firstCall = winner === "edit" ? edit(a) : submit(a);
      await enteredPromise;
      const secondCall = winner === "edit" ? submit(second) : edit(second);
      const resultPromise = Promise.allSettled([firstCall, secondCall]);
      release();
      const results = await resultPromise;
      expect(results[0].status).toBe("fulfilled");
      expect(results[1].status).toBe("rejected");
      const row = (await prisma.saleSheet.findUniqueOrThrow({ where: { id } }))
        .snapshot as unknown as StoredSheet;
      expect(row.revision).toBe(2);
      if (winner === "edit") {
        expect(row.customer).toBeUndefined();
        expect(row.submittedAt).toBeUndefined();
        expect(requests).toBe(count);
        expect(
          await prisma.saleSheetDocument.count({ where: { sheetId: id } }),
        ).toBe(0);
      } else {
        expect(row.notes).toBe(terms().notes);
        expect(row.editOperations).toBeUndefined();
        expect(row.pdf.status).toBe("ready");
        expect(requests).toBe(count + 1);
        expect(
          await prisma.saleSheetDocument.count({ where: { sheetId: id } }),
        ).toBe(1);
      }
    },
  );

  it("cancel endpoint revoga atomicamente; cancel/archive replay não produz eventos duplicados", async () => {
    const created = await create();
    const id = created.sheet.id;
    const count = requests;
    await authorized("post", `${base(id)}/archive`)
      .send({ revision: 1 })
      .expect(409);
    await authorized("post", `${base(id)}/cancel`, "other")
      .send({ revision: 1 })
      .expect(404);
    await authorized("post", `${base(id)}/cancel`)
      .send({ revision: 9 })
      .expect(409);
    const canceled = await authorized("post", `${base(id)}/cancel`)
      .send({ revision: 1 })
      .expect(200);
    const replay = await authorized("post", `${base(id)}/cancel`)
      .send({ revision: 1 })
      .expect(200);
    expect(replay.body).toEqual(canceled.body);
    await request(app.getHttpServer())
      .get(`/ficha-venda/public/${created.token}`)
      .expect(410);
    await authorized("patch", base(id))
      .set("Idempotency-Key", "integration-edit-canceled")
      .send({ revision: 2, terms: terms() })
      .expect(409);
    await authorized("post", `${base(id)}/archive`)
      .send({ revision: 1 })
      .expect(409);
    const archived = await authorized("post", `${base(id)}/archive`, "admin")
      .send({ revision: 2 })
      .expect(200);
    expect(archived.body).toMatchObject({
      revision: 2,
      archivedBy: actors.admin.id,
      revoked: true,
    });
    expect(
      (
        await authorized("post", `${base(id)}/archive`)
          .send({ revision: 2 })
          .expect(200)
      ).body,
    ).toEqual(archived.body);
    expect(
      (await authorized("get", "/ficha-venda/admin").expect(200)).body.some(
        (row: SheetSnapshot) => row.id === id && row.archivedAt,
      ),
    ).toBe(true);
    const events = await prisma.saleSheetEvent.findMany({
      where: { sheetId: id },
    });
    expect(events.map((event) => event.action).sort()).toEqual(
      ["created", "cancel:expected=1;result=2", "archive:revision=2"].sort(),
    );
    expect(requests).toBe(count);
    expect(
      await prisma.saleSheetDocument.count({ where: { sheetId: id } }),
    ).toBe(0);
  });

  it("archive recebida mantém documento imutável, CRM frozen/replay público e revision", async () => {
    const created = await create();
    const id = created.sheet.id;
    await request(app.getHttpServer())
      .post(`/ficha-venda/public/${created.token}`)
      .set("Idempotency-Key", "integration-submit-archive")
      .send(submission())
      .expect(200);
    const before = await prisma.saleSheet.findUniqueOrThrow({ where: { id } });
    const document = await prisma.saleSheetDocument.findUniqueOrThrow({
      where: { sheetId_revision: { sheetId: id, revision: 2 } },
    });
    const count = requests;
    const archived = await authorized("post", `${base(id)}/archive`)
      .send({ revision: 2 })
      .expect(200);
    expect(archived.body).toMatchObject({
      revision: 2,
      archivedBy: actors.sales.id,
    });
    const row = await prisma.saleSheet.findUniqueOrThrow({ where: { id } });
    const {
      archivedAt: _at,
      archivedBy: _by,
      ...snapshot
    } = row.snapshot as unknown as StoredSheet;
    expect(snapshot).toEqual(before.snapshot);
    expect(row.revision).toBe(2);
    expect(
      await prisma.saleSheetDocument.findUniqueOrThrow({
        where: { sheetId_revision: { sheetId: id, revision: 2 } },
      }),
    ).toEqual(document);
    const pdf = await authorized("get", `${base(id)}/contract`).expect(200);
    expect(Buffer.from(pdf.body)).toEqual(Buffer.from(document.bytes));
    const publicView = await request(app.getHttpServer())
      .get(`/ficha-venda/public/${created.token}`)
      .expect(200);
    expect(JSON.stringify(publicView.body)).not.toMatch(
      /archivedAt|archivedBy|editOperations|cancelOperation/,
    );
    await request(app.getHttpServer())
      .post(`/ficha-venda/public/${created.token}`)
      .set("Idempotency-Key", "integration-submit-archive")
      .send(submission())
      .expect(200);
    await authorized("post", `${base(id)}/cancel`)
      .send({ revision: 2 })
      .expect(409);
    await authorized("post", `${base(id)}/contract/retry`).expect(409);
    await authorized("post", `${base(id)}/crm/retry`, "admin").expect(409);
    expect(requests).toBe(count);
    await expect(
      prisma.$executeRaw`UPDATE "sale_sheet_documents" SET "bytes" = decode('00', 'hex') WHERE "sheetId" = ${id}`,
    ).rejects.toThrow(/immutable/);
    await expect(
      prisma.$executeRaw`DELETE FROM "sale_sheet_documents" WHERE "sheetId" = ${id}`,
    ).rejects.toThrow(/immutable/);
  });

  describe("pedidos: POST /admin/:id/unarchive", () => {
    const timestamp = "2026-11-11T12:00:00.000Z";
    async function canceledArchive() {
      const created = await create();
      const id = created.sheet.id;
      await authorized("post", `${base(id)}/cancel`)
        .send({ revision: 1 })
        .expect(200);
      const archived = await authorized("post", `${base(id)}/archive`)
        .send({ revision: 2 })
        .expect(200);
      return {
        ...created,
        id,
        archived: archived.body,
        body: { revision: 2, archivedAt: archived.body.archivedAt as string },
      };
    }

    it("recebido archive → unarchive → archive preserva documento, vendedor, cadastro, termos, CRM e replays públicos", async () => {
      const created = await create();
      const id = created.sheet.id;
      const publicPath = `/ficha-venda/public/${created.token}`;
      await request(app.getHttpServer())
        .post(publicPath)
        .set("Idempotency-Key", "integration-unarchive-submit")
        .send(submission())
        .expect(200);
      const before = await prisma.saleSheet.findUniqueOrThrow({
        where: { id },
      });
      const document = await prisma.saleSheetDocument.findUniqueOrThrow({
        where: { sheetId_revision: { sheetId: id, revision: 2 } },
      });
      const stored = before.snapshot as unknown as StoredSheet;
      expect(stored.sellerSnapshot).toBeDefined();
      expect(stored.customer).toBeDefined();
      expect(stored.crmDelivery).toBeDefined();
      expect(stored.pdf.status).toBe("ready");
      const publicView = await request(app.getHttpServer())
        .get(publicPath)
        .expect(200);
      const publicReplay = await request(app.getHttpServer())
        .post(publicPath)
        .set("Idempotency-Key", "integration-unarchive-submit")
        .send(submission())
        .expect(200);
      const payload = await authorized(
        "get",
        `${base(id)}/crm-payload`,
        "admin",
      ).expect(200);
      const eventsBefore = await prisma.saleSheetEvent.count({
        where: { sheetId: id },
      });
      const count = requests;
      const renders = render.mock.calls.length;
      const catalogSpy = jest
        .spyOn(catalog, "list")
        .mockRejectedValue(
          new Error("não consultar catálogo no desarquivamento"),
        );
      try {
        const archived = await authorized("post", `${base(id)}/archive`)
          .send({ revision: 2 })
          .expect(200);
        const archivedPublic = await request(app.getHttpServer())
          .get(publicPath)
          .expect(200);
        expect(archivedPublic.body).toEqual(publicView.body);
        const archivedReplay = await request(app.getHttpServer())
          .post(publicPath)
          .set("Idempotency-Key", "integration-unarchive-submit")
          .send(submission())
          .expect(200);
        expect(archivedReplay.body).toEqual(publicReplay.body);
        const body = { revision: 2, archivedAt: archived.body.archivedAt };
        const unarchived = await authorized(
          "post",
          `${base(id)}/unarchive`,
          "admin",
        )
          .send(body)
          .expect(200);
        expect(unarchived.headers["cache-control"]).toBe(
          "private, no-store, max-age=0",
        );
        expect(unarchived.body).toEqual(
          await second.getAdmin(actors.sales, id),
        );
        expect(unarchived.body).not.toHaveProperty("archivedAt");
        expect(unarchived.body).not.toHaveProperty("archivedBy");
        expect(unarchived.body).not.toHaveProperty("sheet");
        // Prisma @updatedAt tracks the metadata write; all other columns are frozen.
        const { updatedAt: _beforeUpdatedAt, ...businessBefore } = before;
        const { updatedAt: _afterUpdatedAt, ...businessAfter } =
          await prisma.saleSheet.findUniqueOrThrow({ where: { id } });
        expect(businessAfter).toEqual(businessBefore);
        expect(await second.unarchive(actors.sales, id, body)).toEqual(
          unarchived.body,
        );
        expect(
          (
            await authorized("post", `${base(id)}/unarchive`)
              .send(body)
              .expect(200)
          ).body,
        ).toEqual(unarchived.body);
        const unarchivedPublic = await request(app.getHttpServer())
          .get(publicPath)
          .expect(200);
        expect(unarchivedPublic.body).toEqual(publicView.body);
        const unarchivedReplay = await request(app.getHttpServer())
          .post(publicPath)
          .set("Idempotency-Key", "integration-unarchive-submit")
          .send(submission())
          .expect(200);
        expect(unarchivedReplay.body).toEqual(publicReplay.body);
        const payloadAfter = await authorized(
          "get",
          `${base(id)}/crm-payload`,
          "admin",
        ).expect(200);
        expect(payloadAfter.body).toEqual(payload.body);
        await authorized("patch", base(id))
          .set("Idempotency-Key", "integration-edit-unarchived-received")
          .send({ revision: 2, terms: terms() })
          .expect(409);
        const archivedAgain = await authorized(
          "post",
          `${base(id)}/archive`,
          "admin",
        )
          .send({ revision: 2 })
          .expect(200);
        expect(archivedAgain.body.revision).toBe(2);
        const row = await prisma.saleSheet.findUniqueOrThrow({ where: { id } });
        const {
          archivedAt: _at,
          archivedBy: _by,
          ...snapshot
        } = row.snapshot as unknown as StoredSheet;
        expect(snapshot).toEqual(before.snapshot);
        expect(
          await prisma.saleSheetDocument.findUniqueOrThrow({
            where: { sheetId_revision: { sheetId: id, revision: 2 } },
          }),
        ).toEqual(document);
        const pdf = await authorized("get", `${base(id)}/contract`).expect(200);
        expect(Buffer.from(pdf.body)).toEqual(Buffer.from(document.bytes));
        expect(hash(Buffer.from(pdf.body).toString())).toBe(document.sha256);
        expect(
          (await request(app.getHttpServer()).get(publicPath).expect(200)).body,
        ).toEqual(publicView.body);
        expect(
          (
            await request(app.getHttpServer())
              .post(publicPath)
              .set("Idempotency-Key", "integration-unarchive-submit")
              .send(submission())
              .expect(200)
          ).body,
        ).toEqual(publicReplay.body);
        expect(
          await prisma.saleSheetEvent.count({ where: { sheetId: id } }),
        ).toBe(eventsBefore + 3);
        const actions = (
          await prisma.saleSheetEvent.findMany({
            where: {
              sheetId: id,
              action: { in: ["archive:revision=2", "unarchive:revision=2"] },
            },
          })
        )
          .map((event) => event.action)
          .sort();
        expect(actions).toEqual([
          "archive:revision=2",
          "archive:revision=2",
          "unarchive:revision=2",
        ]);
        expect(JSON.stringify(actions)).not.toMatch(
          /archivedAt|archivedBy|@|2026|customer|token/,
        );
        expect(catalogSpy).not.toHaveBeenCalled();
        expect(requests).toBe(count);
        expect(render).toHaveBeenCalledTimes(renders);
      } finally {
        catalogSpy.mockRestore();
      }
    });

    it("cancelado archive → unarchive mantém revoked/token/revisão e não libera público/edição/link", async () => {
      const p = await canceledArchive();
      const before = await prisma.saleSheet.findUniqueOrThrow({
        where: { id: p.id },
      });
      const {
        archivedAt: _at,
        archivedBy: _by,
        ...expected
      } = before.snapshot as unknown as StoredSheet;
      const count = requests;
      const renders = render.mock.calls.length;
      const result = await authorized("post", `${base(p.id)}/unarchive`)
        .send(p.body)
        .expect(200);
      expect(result.body).toMatchObject({ revision: 2, revoked: true });
      const row = await prisma.saleSheet.findUniqueOrThrow({
        where: { id: p.id },
      });
      const { updatedAt: _beforeUpdatedAt, ...businessBefore } = before;
      const { updatedAt: _afterUpdatedAt, ...businessAfter } = row;
      expect(businessAfter).toEqual({ ...businessBefore, snapshot: expected });
      await request(app.getHttpServer())
        .get(`/ficha-venda/public/${p.token}`)
        .expect(410);
      await request(app.getHttpServer())
        .post(`/ficha-venda/public/${p.token}`)
        .set("Idempotency-Key", "integration-unarchive-canceled-submit")
        .send(submission())
        .expect(410);
      await authorized("patch", base(p.id))
        .set("Idempotency-Key", "integration-unarchive-canceled-edit")
        .send({ revision: 2, terms: terms() })
        .expect(409);
      await authorized("post", `${base(p.id)}/link`).expect(409);
      expect(
        await prisma.saleSheet.findUniqueOrThrow({ where: { id: p.id } }),
      ).toEqual(row);
      expect(
        await prisma.saleSheetDocument.count({ where: { sheetId: p.id } }),
      ).toBe(0);
      expect(
        (await prisma.saleSheetEvent.findMany({ where: { sheetId: p.id } }))
          .map((event) => event.action)
          .sort(),
      ).toEqual(
        [
          "created",
          "cancel:expected=1;result=2",
          "archive:revision=2",
          "unarchive:revision=2",
        ].sort(),
      );
      expect(requests).toBe(count);
      expect(render).toHaveBeenCalledTimes(renders);
    });

    it("JWT obrigatório, SALES own vs other, ADMIN todos e role inválido bloqueado", async () => {
      const p = await canceledArchive();
      const before = await prisma.saleSheet.findUniqueOrThrow({
        where: { id: p.id },
      });
      const events = await prisma.saleSheetEvent.count({
        where: { sheetId: p.id },
      });
      await request(app.getHttpServer())
        .post(`${base(p.id)}/unarchive`)
        .send(p.body)
        .expect(401);
      await authorized("post", `${base(p.id)}/unarchive`, "other")
        .send(p.body)
        .expect(404);
      await authorized("post", `${base(p.id)}/unarchive`, "invalidrole")
        .send(p.body)
        .expect(403);
      await prisma.$executeRaw`UPDATE "users" SET "role" = 'SALES'::"UserRole" WHERE id = ${actors.admin.id}`;
      try {
        await authorized("post", `${base(p.id)}/unarchive`, "admin")
          .send(p.body)
          .expect(403);
      } finally {
        await prisma.$executeRaw`UPDATE "users" SET "role" = 'ADMIN'::"UserRole" WHERE id = ${actors.admin.id}`;
      }
      expect(
        await prisma.saleSheet.findUniqueOrThrow({ where: { id: p.id } }),
      ).toEqual(before);
      expect(
        await prisma.saleSheetEvent.count({ where: { sheetId: p.id } }),
      ).toBe(events);
      await authorized("post", `${base(p.id)}/unarchive`, "admin")
        .send(p.body)
        .expect(200);
      expect(
        (
          await authorized("post", `${base(p.id)}/unarchive`)
            .send(p.body)
            .expect(200)
        ).body,
      ).not.toHaveProperty("archivedAt");
      expect(
        await prisma.saleSheetEvent.count({
          where: { sheetId: p.id, action: "unarchive:revision=2" },
        }),
      ).toBe(1);
    });

    it.each([
      {},
      [],
      { revision: 2 },
      { revision: "2", archivedAt: timestamp },
      { revision: 0, archivedAt: timestamp },
      { revision: 2.5, archivedAt: timestamp },
      { revision: 2147483648, archivedAt: timestamp },
      { revision: 2, archivedAt: null },
      { revision: 2, archivedAt: 123 },
      { revision: 2, archivedAt: "2026-11-11" },
      { revision: 2, archivedAt: "2026-11-11T12:00:00Z" },
      { revision: 2, archivedAt: "2026-11-11T12:00:00.000+00:00" },
      { revision: 2, archivedAt: "2026-11-11T12:00:00.000z" },
      { revision: 2, archivedAt: "2026-11-11T12:00:00.000Z " },
      { revision: 2, archivedAt: "2026-02-30T12:00:00.000Z" },
      { revision: 2, archivedAt: "2026-11-11T24:00:00.000Z" },
      { revision: 2, archivedAt: "2026-11-11T12:60:00.000Z" },
      { revision: 2, archivedAt: "2026-11-11T12:00:60.000Z" },
      { revision: 2, archivedAt: timestamp, revoked: false },
    ])(
      "body inválido retorna 400 PTBR e não muda snapshot/eventos (%j)",
      async (body) => {
        const p = await canceledArchive();
        const before = await prisma.saleSheet.findUniqueOrThrow({
          where: { id: p.id },
        });
        const count = await prisma.saleSheetEvent.count({
          where: { sheetId: p.id },
        });
        const result = await authorized("post", `${base(p.id)}/unarchive`)
          .send(body)
          .expect(400);
        expect(result.body.message).toBe(
          "Dados inválidos. Confira a revisão e a data de arquivamento do pedido.",
        );
        expect(
          await prisma.saleSheet.findUniqueOrThrow({ where: { id: p.id } }),
        ).toEqual(before);
        expect(
          await prisma.saleSheetEvent.count({ where: { sheetId: p.id } }),
        ).toBe(count);
      },
    );

    it("revisão incorreta conflita em ambos estados, timestamp stale conflita arquivado, no-op não cria evento", async () => {
      const p = await canceledArchive();
      const before = await prisma.saleSheet.findUniqueOrThrow({
        where: { id: p.id },
      });
      const count = await prisma.saleSheetEvent.count({
        where: { sheetId: p.id },
      });
      await authorized("post", `${base(p.id)}/unarchive`)
        .send({ ...p.body, revision: 1 })
        .expect(409);
      const stale = new Date(Date.parse(p.body.archivedAt) - 1).toISOString();
      await authorized("post", `${base(p.id)}/unarchive`)
        .send({ revision: 2, archivedAt: stale })
        .expect(409);
      expect(
        await prisma.saleSheet.findUniqueOrThrow({ where: { id: p.id } }),
      ).toEqual(before);
      expect(
        await prisma.saleSheetEvent.count({ where: { sheetId: p.id } }),
      ).toBe(count);
      await authorized("post", `${base(p.id)}/unarchive`)
        .send(p.body)
        .expect(200);
      const unarchived = await prisma.saleSheet.findUniqueOrThrow({
        where: { id: p.id },
      });
      await authorized("post", `${base(p.id)}/unarchive`)
        .send({ ...p.body, revision: 1 })
        .expect(409);
      await authorized("post", `${base(p.id)}/unarchive`)
        .send({ revision: 2, archivedAt: stale })
        .expect(200);
      expect(
        await prisma.saleSheet.findUniqueOrThrow({ where: { id: p.id } }),
      ).toEqual(unarchived);
      expect(
        await prisma.saleSheetEvent.count({ where: { sheetId: p.id } }),
      ).toBe(count + 1);
    });

    it("duplicates HTTP e segunda conexão usam advisory lock e gravam uma transição/evento", async () => {
      const p = await canceledArchive();
      const results = await Promise.all([
        authorized("post", `${base(p.id)}/unarchive`)
          .send(p.body)
          .expect(200),
        authorized("post", `${base(p.id)}/unarchive`, "admin")
          .send(p.body)
          .expect(200),
        second.unarchive(actors.sales, p.id, p.body),
      ]);
      expect(results[0].body).toEqual(results[1].body);
      expect(results[0].body).toEqual(results[2]);
      expect(
        await prisma.saleSheetEvent.count({
          where: { sheetId: p.id, action: "unarchive:revision=2" },
        }),
      ).toBe(1);
      expect(
        await prisma.saleSheetEvent.count({ where: { sheetId: p.id } }),
      ).toBe(4);
    });

    it("archive concorrente vence e retry atrasado não apaga novo ciclo da mesma revisão", async () => {
      const p = await canceledArchive();
      await authorized("post", `${base(p.id)}/unarchive`)
        .send(p.body)
        .expect(200);
      await new Promise((resolve) => setTimeout(resolve, 2));
      const repository = new PostgresSheetRepository(prisma as PrismaService);
      const original = repository.transact.bind(repository);
      let entered!: () => void;
      const enteredPromise = new Promise<void>((resolve) => {
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
      const archiver = new SaleSheetService(
        repository,
        catalog,
        { version: "integration-fake-v1", render },
        demoSeller,
        transport,
      );
      const archiveCall = archiver.archive(actors.admin, p.id, { revision: 2 });
      await enteredPromise;
      const staleCall = second.unarchive(actors.sales, p.id, p.body);
      const outcomes = Promise.allSettled([archiveCall, staleCall]);
      release();
      const results = await outcomes;
      expect(results[0].status).toBe("fulfilled");
      expect(results[1].status).toBe("rejected");
      expect((results[1] as PromiseRejectedResult).reason.getStatus()).toBe(
        409,
      );
      const current = await prisma.saleSheet.findUniqueOrThrow({
        where: { id: p.id },
      });
      const snapshot = current.snapshot as unknown as StoredSheet;
      expect(snapshot.archivedAt).not.toBe(p.body.archivedAt);
      expect(snapshot.archivedBy).toBe(actors.admin.id);
      expect(snapshot.revision).toBe(2);
      await authorized("post", `${base(p.id)}/unarchive`)
        .send(p.body)
        .expect(409);
      expect(
        await prisma.saleSheet.findUniqueOrThrow({ where: { id: p.id } }),
      ).toEqual(current);
      expect(
        await prisma.saleSheetEvent.count({
          where: { sheetId: p.id, action: "unarchive:revision=2" },
        }),
      ).toBe(1);
      await authorized("post", `${base(p.id)}/unarchive`)
        .send({ revision: 2, archivedAt: snapshot.archivedAt })
        .expect(200);
      expect(
        await prisma.saleSheetEvent.count({
          where: { sheetId: p.id, action: "unarchive:revision=2" },
        }),
      ).toBe(2);
    });

    it("verifica revisão sob lock após outra conexão atualizar o snapshot", async () => {
      const p = await canceledArchive();
      let entered!: () => void;
      const enteredPromise = new Promise<void>((resolve) => {
        entered = resolve;
      });
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const repository = new PostgresSheetRepository(prisma as PrismaService);
      const writer = repository.transact(async (rows) => {
        entered();
        await gate;
        rows.find((sheet) => sheet.id === p.id)!.revision = 3;
      });
      await enteredPromise;
      const attempted = second.unarchive(actors.sales, p.id, p.body);
      const outcomes = Promise.allSettled([writer, attempted]);
      release();
      const results = await outcomes;
      expect(results[1].status).toBe("rejected");
      expect((results[1] as PromiseRejectedResult).reason.getStatus()).toBe(
        409,
      );
      const row = await prisma.saleSheet.findUniqueOrThrow({
        where: { id: p.id },
      });
      expect(row.snapshot).toMatchObject({
        revision: 3,
        archivedAt: p.body.archivedAt,
        archivedBy: actors.sales.id,
      });
      expect(
        await prisma.saleSheetEvent.count({
          where: { sheetId: p.id, action: "unarchive:revision=3" },
        }),
      ).toBe(0);
    });

    it("pedido pendente já não arquivado é no-op sem evento", async () => {
      const created = await create();
      const id = created.sheet.id;
      const before = await prisma.saleSheet.findUniqueOrThrow({
        where: { id },
      });
      const count = await prisma.saleSheetEvent.count({
        where: { sheetId: id },
      });
      await authorized("post", `${base(id)}/unarchive`)
        .send({ revision: 1, archivedAt: timestamp })
        .expect(200);
      expect(
        await prisma.saleSheet.findUniqueOrThrow({ where: { id } }),
      ).toEqual(before);
      expect(
        await prisma.saleSheetEvent.count({ where: { sheetId: id } }),
      ).toBe(count);
    });
  });

  it("revalidação real do guard rejeita role removida no banco", async () => {
    const created = await create();
    await prisma.$executeRaw`UPDATE "users" SET "role" = 'SALES'::"UserRole" WHERE id = ${actors.admin.id}`;
    await authorized("post", `${base(created.sheet.id)}/cancel`, "admin")
      .send({ revision: 1 })
      .expect(403);
    await prisma.$executeRaw`UPDATE "users" SET "role" = 'ADMIN'::"UserRole" WHERE id = ${actors.admin.id}`;
    await authorized("post", `${base(created.sheet.id)}/cancel`, "admin")
      .send({ revision: 1 })
      .expect(200);
  });
});
