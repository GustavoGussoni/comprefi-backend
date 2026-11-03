import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ValidationPipe,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { CurrentUsedStockUserGuard } from "./current-used-stock-user.guard";
import { UsedStockController } from "./used-stock.controller";
import { UsedStockService } from "./used-stock.service";

class TestJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().user = { id: "actor-1", role: "SALES" };
    return true;
  }
}

const draft = {
  id: "unit-1",
  revision: 1,
  model: "iPhone 15",
  storage: "128GB",
  color: "Preto",
  catalogVariantId: "variant-seminovo-1",
  catalogLinked: true,
  catalogActive: true,
  battery: null,
  details: "",
  image: "",
  imageIsIllustrative: true,
  realImages: [],
  pixPrice: 0,
  installments: 12,
  installmentPrice: 0,
  imei: null,
  internalNotes: "privado",
  status: "draft",
  createdAt: "2026-10-28T00:00:00.000Z",
  updatedAt: "2026-10-28T00:00:00.000Z",
  receivedAt: null,
  checkedAt: null,
  activatedAt: null,
  soldAt: null,
  createdById: "actor-1",
  history: [],
};

describe("UsedStockController HTTP", () => {
  let app: import("@nestjs/common").INestApplication;
  const service = {
    listPublic: jest.fn(),
    getPublic: jest.fn(),
    listAdmin: jest.fn(),
    getAdmin: jest.fn(),
    listCatalogVariants: jest.fn(),
    create: jest.fn(),
    patch: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
    sold: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [UsedStockController],
      providers: [{ provide: UsedStockService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestJwtGuard)
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(CurrentUsedStockUserGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => app.close());

  it("serve somente a API pública atual com no-store", async () => {
    const publicUnit = {
      id: "public-1",
      model: "iPhone 15",
      storage: "128GB",
      color: "Preto",
      battery: 91,
      details: "Sem detalhes.",
      image: "/assets/test-fixtures/used-stock-fictional-photo.jpg",
      imageIsIllustrative: false,
      realImages: ["/assets/test-fixtures/used-stock-fictional-photo.jpg"],
      pixPrice: 2500,
      installments: 12,
      installmentPrice: 250,
    };
    service.listPublic.mockResolvedValue([publicUnit]);
    await request(app.getHttpServer())
      .get("/used-stock/public")
      .expect("Cache-Control", "no-store")
      .expect(200, [publicUnit]);
  });

  it("exige JWT real nas rotas administrativas", async () => {
    const module = await Test.createTestingModule({
      controllers: [UsedStockController],
      providers: [{ provide: UsedStockService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => false })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(CurrentUsedStockUserGuard)
      .useValue({ canActivate: () => true })
      .compile();
    const protectedApp = module.createNestApplication();
    await protectedApp.init();
    await request(protectedApp.getHttpServer()).get("/used-stock/admin/catalog-variants").expect(403);
    await protectedApp.close();
  });

  it("expõe opções de variante autenticadas antes de :id, para ADMIN e SALES", async () => {
    const options = [
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
    ];
    service.listCatalogVariants.mockResolvedValue(options);
    await request(app.getHttpServer())
      .get("/used-stock/admin/catalog-variants")
      .expect("Cache-Control", "no-store")
      .expect(200, options);
    expect(service.listCatalogVariants).toHaveBeenCalledTimes(1);
    expect(service.getAdmin).not.toHaveBeenCalled();
  });

  it("encaminha criação validada pelo ID de variante com ator do JWT e responde 201", async () => {
    service.create.mockResolvedValue(draft);
    const body = {
      creationKey: "d0b9a9d1-1cd6-4ad0-9c7d-8026ea9be7c4",
      catalogVariantId: "variant-seminovo-1",
      image: "/assets/test-fixtures/used-stock-fictional-photo.jpg",
      imei: "123456789012345",
    };
    await request(app.getHttpServer()).post("/used-stock/admin").send(body).expect(201, draft);
    expect(service.create).toHaveBeenCalledWith(
      { id: "actor-1", role: "SALES" },
      expect.objectContaining(body),
    );
  });

  it("rejeita controles, identidade client-side, URL insegura e render conhecido antes do serviço", async () => {
    const valid = {
      creationKey: "d0b9a9d1-1cd6-4ad0-9c7d-8026ea9be7c4",
      catalogVariantId: "variant-seminovo-1",
    };
    for (const body of [
      { ...valid, status: "available" },
      { ...valid, model: "iPhone injetado" },
      { ...valid, image: "javascript:alert(1)" },
      { ...valid, image: "/assets/used-stock/iphone12-pro-max-azul.jpg" },
    ]) {
      await request(app.getHttpServer()).post("/used-stock/admin").send(body).expect(400);
    }
    expect(service.create).not.toHaveBeenCalled();
  });

  it("rejeita patch sem campo editável e encaminha transitions com no-store", async () => {
    service.patch.mockRejectedValue(new BadRequestException("Informe ao menos um campo editável."));
    await request(app.getHttpServer())
      .patch("/used-stock/admin/unit-1")
      .send({ expectedRevision: 1 })
      .expect(400);
    expect(service.patch).toHaveBeenCalledWith(
      { id: "actor-1", role: "SALES" },
      "unit-1",
      expect.objectContaining({ expectedRevision: 1 }),
    );

    service.sold.mockResolvedValue({ ...draft, status: "sold", revision: 2 });
    await request(app.getHttpServer())
      .post("/used-stock/admin/unit-1/sold")
      .send({ expectedRevision: 1 })
      .expect("Cache-Control", "no-store")
      .expect(200);
  });
});
