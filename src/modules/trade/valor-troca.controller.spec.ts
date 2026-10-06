import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PrismaService } from "../../database/prisma.service";
import { AdminIdentityGuard } from "../auth/admin-identity.guard";
import { ValorTrocaController } from "./valor-troca.controller";

describe("ValorTrocaController — autorização HTTP local", () => {
  let app: INestApplication;
  const prisma = {
    valorTroca: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: "synthetic" }),
    },
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ValorTrocaController],
      providers: [
        AdminIdentityGuard,
        {
          provide: ConfigService,
          useValue: { get: () => "gustavo@example.com" },
        },
        { provide: PrismaService, useValue: prisma },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => {
            getRequest: () => {
              user?: { email?: string };
              headers: Record<string, string>;
            };
          };
        }) => {
          const req = context.switchToHttp().getRequest();
          req.user = { email: req.headers["x-test-email"] };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  const value = { modelo: "iPhone 15", capacidade: "128GB", valorBase: 2500 };

  it("recusa a escrita de Iago sem tocar a tabela", async () => {
    await request(app.getHttpServer())
      .post("/trade/valores")
      .set("x-test-email", "iago@example.com")
      .send(value)
      .expect(403);
    expect(prisma.valorTroca.create).not.toHaveBeenCalled();
  });

  it("permite a escrita de Gustavo", async () => {
    await request(app.getHttpServer())
      .post("/trade/valores")
      .set("x-test-email", "gustavo@example.com")
      .send(value)
      .expect(201);
    expect(prisma.valorTroca.create).toHaveBeenCalledTimes(1);
  });

  it("mantém a leitura da tabela pública", async () => {
    await request(app.getHttpServer()).get("/trade/valores").expect(200);
  });
});
