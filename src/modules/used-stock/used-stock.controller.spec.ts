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
      image: "/assets/used-stock/iphone-15.jpg",
      imageIsIllustrative: true,
      realImages: [],
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
    await request(protectedApp.getHttpServer()).get("/used-stock/admin").expect(403);
    await protectedApp.close();
  });

  it("encaminha criação validada com ator do JWT e responde 201", async () => {
    service.create.mockResolvedValue(draft);
    const body = {
      creationKey: "d0b9a9d1-1cd6-4ad0-9c7d-8026ea9be7c4",
      model: "iPhone 15",
      storage: "128GB",
      color: "Preto",
      image: "/assets/used-stock/iphone-15.jpg",
      imei: "123456789012345",
    };
    await request(app.getHttpServer()).post("/used-stock/admin").send(body).expect(201, draft);
    expect(service.create).toHaveBeenCalledWith(
      { id: "actor-1", role: "SALES" },
      expect.objectContaining(body),
    );
  });

  it("rejeita campos de controle e URLs de imagem inseguras antes do serviço", async () => {
    const valid = {
      creationKey: "d0b9a9d1-1cd6-4ad0-9c7d-8026ea9be7c4",
      model: "iPhone 15",
      storage: "128GB",
      color: "Preto",
    };
    await request(app.getHttpServer())
      .post("/used-stock/admin")
      .send({ ...valid, status: "available" })
      .expect(400);
    await request(app.getHttpServer())
      .post("/used-stock/admin")
      .send({ ...valid, image: "javascript:alert(1)" })
      .expect(400);
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
