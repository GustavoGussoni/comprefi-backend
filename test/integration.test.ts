// test/integration.test.ts
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/database/prisma.service";

describe("CompreFi API Integration Tests", () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();

    // Criar usuário de teste e obter token
    await setupTestUser();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function setupTestUser() {
    try {
      // Registrar usuário de teste
      const registerResponse = await request(app.getHttpServer())
        .post("/auth/register")
        .send({
          name: "Test User",
          email: "test@comprefi.com",
          password: "test123456",
        });

      // Fazer login para obter token
      const loginResponse = await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          email: "test@comprefi.com",
          password: "test123456",
        });

      authToken = loginResponse.body.access_token;
    } catch (error) {
      console.log("Usuário de teste já existe ou erro na criação");

      // Tentar fazer login direto
      const loginResponse = await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          email: "test@comprefi.com",
          password: "test123456",
        });

      if (loginResponse.body.access_token) {
        authToken = loginResponse.body.access_token;
      }
    }
  }

  async function cleanupTestData() {
    try {
      // Limpar dados de teste
      await prismaService.product.deleteMany({
        where: {
          user: {
            email: "test@comprefi.com",
          },
        },
      });

      // Limpar dados de troca de teste
      await prismaService.questionarioTroca.deleteMany({
        where: {
          modeloAtual: { contains: "Test" },
        },
      });
    } catch (error) {
      console.log("Erro na limpeza dos dados de teste:", error);
    }
  }

  describe("Price Calculator Endpoints", () => {
    it("POST /products/calculate-prices - deve calcular preços corretamente", async () => {
      const response = await request(app.getHttpServer())
        .post("/products/calculate-prices")
        .send({
          cost: 4500,
          freight: 100,
        })
        .expect(201);

      expect(response.body).toHaveProperty("pixPrice");
      expect(response.body).toHaveProperty("installmentPrice");
      expect(response.body).toHaveProperty("originalPrice");
      expect(response.body).toHaveProperty("rawValues");

      // Validar cálculos
      expect(response.body.rawValues.pixPrice).toBeCloseTo(5111.11, 2);
      expect(response.body.rawValues.originalPrice).toBeCloseTo(5476.19, 2);
      expect(response.body.rawValues.installmentPrice).toBeCloseTo(492.34, 1); // Ajustado para precisão 1

      // Validar formatação
      expect(response.body.pixPrice).toBe("R$ 5111,11");
      expect(response.body.originalPrice).toBe("R$ 5476,19");
    });

    it("POST /products/calculate-prices - deve aplicar frete especial para Macbooks", async () => {
      const response = await request(app.getHttpServer())
        .post("/products/calculate-prices")
        .send({
          cost: 8000,
          freight: 100,
          category: "Macbooks",
        })
        .expect(201);

      // Deve usar frete 220 em vez de 100
      // pixPrice = (8000 + 220) / 0.9 = 9133.33
      expect(response.body.rawValues.pixPrice).toBeCloseTo(9133.33, 2);
    });

    it("POST /products/calculate-prices - deve usar frete padrão para outras categorias", async () => {
      const response = await request(app.getHttpServer())
        .post("/products/calculate-prices")
        .send({
          cost: 4500,
          freight: 100,
          category: "iPhones Novos",
        })
        .expect(201);

      // Deve usar frete 100 (padrão)
      expect(response.body.rawValues.pixPrice).toBeCloseTo(5111.11, 2);
    });
  });

  describe("Trade Calculator Endpoints", () => {
    it("GET /trade/combinations - deve retornar combinações válidas", async () => {
      const response = await request(app.getHttpServer())
        .get("/trade/combinations")
        .expect(200);

      expect(response.body).toHaveProperty("iPhone 13 Pro");
      expect(response.body["iPhone 13 Pro"]).toContain("256GB");
      expect(response.body["iPhone 15 Pro Max"]).not.toContain("128GB"); // 15 Pro Max não tem 128GB
    });

    it("GET /trade/colors/:modelo - deve retornar cores por modelo", async () => {
      const response = await request(app.getHttpServer())
        .get("/trade/colors/iPhone 13 Pro")
        .expect(200);

      expect(response.body).toHaveProperty("modelo");
      expect(response.body).toHaveProperty("colors");
      expect(Array.isArray(response.body.colors)).toBe(true);
      expect(response.body.colors).toContain("Grafite");
    });

    it("GET /trade/defects - deve retornar lista de defeitos", async () => {
      const response = await request(app.getHttpServer())
        .get("/trade/defects")
        .expect(200);

      expect(response.body).toHaveProperty("instantCalculation");
      expect(response.body).toHaveProperty("manualQuotation");
      expect(Array.isArray(response.body.instantCalculation)).toBe(true);
      expect(Array.isArray(response.body.manualQuotation)).toBe(true);
    });

    it("GET /trade/qualification-options - deve retornar opções de qualificação", async () => {
      const response = await request(app.getHttpServer())
        .get("/trade/qualification-options")
        .expect(200);

      expect(response.body).toHaveProperty("ondeOuviu");
      expect(response.body).toHaveProperty("tempoPensando");
      expect(response.body).toHaveProperty("urgenciaTroca");
      expect(response.body.ondeOuviu).toContain("Instagram");
    });

    it("POST /trade/calculate - deve calcular troca usando tabela de valores", async () => {
      const response = await request(app.getHttpServer())
        .post("/trade/calculate")
        .send({
          modeloAtual: "iPhone 13 Pro",
          capacidadeAtual: "256GB",
          corAtual: "Grafite",
          bateriaAtual: 95,
          defeitos: ["detalhe_leve"],
          modeloDesejado: "iPhone 15 Pro",
          ondeOuviu: "Instagram",
          tempoPensando: "Há 2 meses",
          urgenciaTroca: "Próxima semana",
        })
        .expect(201);

      expect(response.body).toHaveProperty("valorAparelho");
      expect(response.body).toHaveProperty("valorFinal");
      expect(response.body).toHaveProperty("temDefeito");
      expect(response.body).toHaveProperty("precisaCotacao");
      expect(response.body).toHaveProperty("valorManualUsado");
      expect(response.body).toHaveProperty("produtoDesejado");
      expect(response.body).toHaveProperty("cupomDesconto");
      expect(response.body).toHaveProperty("valorComDesconto");

      // Verificar se usou tabela (não manual)
      expect(response.body.valorManualUsado).toBe(false);
      expect(response.body.temDefeito).toBe(true); // Tem detalhe_leve
      expect(response.body.precisaCotacao).toBe(false); // Defeito leve não precisa cotação
    });

    it("POST /trade/calculate - deve calcular troca usando valor manual", async () => {
      const response = await request(app.getHttpServer())
        .post("/trade/calculate")
        .send({
          modeloAtual: "iPhone 13 Pro Test",
          capacidadeAtual: "256GB",
          corAtual: "Grafite",
          bateriaAtual: 100,
          valorManual: 3800.0, // Valor manual
          defeitos: [],
          modeloDesejado: "iPhone 15 Pro",
          ondeOuviu: "Instagram",
          tempoPensando: "Há 1 mês",
          urgenciaTroca: "Agora",
        })
        .expect(201);

      expect(response.body.valorManualUsado).toBe(true);
      expect(response.body.valorAparelho).toBeCloseTo(3600.0, 2); // 3800 - 200 (bateria 100%)
      expect(response.body.temDefeito).toBe(false);
      expect(response.body.precisaCotacao).toBe(false);
    });

    it("POST /trade/calculate - deve exigir cotação manual para defeitos graves", async () => {
      const response = await request(app.getHttpServer())
        .post("/trade/calculate")
        .send({
          modeloAtual: "iPhone 13 Pro",
          capacidadeAtual: "256GB",
          corAtual: "Grafite",
          bateriaAtual: 85,
          defeitos: ["tela_quebrada"], // Defeito grave
          modeloDesejado: "iPhone 15 Pro",
          ondeOuviu: "TikTok",
          tempoPensando: "Há 3 meses",
          urgenciaTroca: "Daqui 2 semanas",
        })
        .expect(201);

      expect(response.body.precisaCotacao).toBe(true);
      expect(response.body.valorAparelho).toBe(0);
      expect(response.body.valorFinal).toBe(0);
      expect(response.body.temDefeito).toBe(true);
    });

    it("POST /trade/calculate - deve exigir cotação manual para peças trocadas", async () => {
      const response = await request(app.getHttpServer())
        .post("/trade/calculate")
        .send({
          modeloAtual: "iPhone 13 Pro",
          capacidadeAtual: "256GB",
          corAtual: "Grafite",
          bateriaAtual: 95,
          defeitos: [],
          pecasTrocadas: true,
          quaisPecas: "Tela e bateria",
          modeloDesejado: "iPhone 15 Pro",
          ondeOuviu: "Facebook",
          tempoPensando: "Primeira vez",
          urgenciaTroca: "Próximo mês",
        })
        .expect(201);

      expect(response.body.precisaCotacao).toBe(true);
      expect(response.body.valorAparelho).toBe(0);
      expect(response.body.valorFinal).toBe(0);
    });

    it("POST /trade/calculate - deve aplicar depreciação por bateria", async () => {
      // Teste com bateria 100%
      const response100 = await request(app.getHttpServer())
        .post("/trade/calculate")
        .send({
          modeloAtual: "iPhone 13 Pro",
          capacidadeAtual: "256GB",
          corAtual: "Grafite",
          bateriaAtual: 100,
          valorManual: 3500.0,
          defeitos: [],
          modeloDesejado: "iPhone 15 Pro",
        })
        .expect(201);

      // Teste com bateria 75%
      const response75 = await request(app.getHttpServer())
        .post("/trade/calculate")
        .send({
          modeloAtual: "iPhone 13 Pro",
          capacidadeAtual: "256GB",
          corAtual: "Grafite",
          bateriaAtual: 75,
          valorManual: 3500.0,
          defeitos: [],
          modeloDesejado: "iPhone 15 Pro",
        })
        .expect(201);

      // Bateria 100% deve ter menos depreciação que 75%
      expect(response100.body.valorAparelho).toBeGreaterThan(
        response75.body.valorAparelho
      );

      // Verificar depreciações específicas
      expect(response100.body.valorAparelho).toBeCloseTo(3300.0, 2); // 3500 - 200
      expect(response75.body.valorAparelho).toBeCloseTo(1800.0, 2); // 3500 - 1700
    });

    it("POST /trade/calculate - deve retornar erro para modelo não encontrado", async () => {
      await request(app.getHttpServer())
        .post("/trade/calculate")
        .send({
          modeloAtual: "iPhone Inexistente",
          capacidadeAtual: "256GB",
          corAtual: "Preto",
          bateriaAtual: 95,
          defeitos: [],
          modeloDesejado: "iPhone 15 Pro",
        })
        .expect(400);
    });
  });

  describe("Product CRUD Endpoints", () => {
    let createdProductId: string;

    it("POST /products - deve criar produto com cálculo automático", async () => {
      const productData = {
        model: "iPhone 15 Pro Test",
        storage: "256GB",
        color: "Titânio Natural",
        battery: "100%",
        category: "iPhones Novos",
        specs: "Especificações de teste",
        details: "Produto de teste",
        cost: 7000,
        freight: 100,
        isNew: true,
        isActive: true,
      };

      const response = await request(app.getHttpServer())
        .post("/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send(productData)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.model).toBe(productData.model);
      expect(response.body.category).toBe(productData.category);
      expect(response.body).toHaveProperty("pixPrice");
      expect(response.body).toHaveProperty("installmentPrice");
      expect(response.body).toHaveProperty("originalPrice");

      createdProductId = response.body.id;
    });

    it("GET /products - deve listar produtos", async () => {
      const response = await request(app.getHttpServer())
        .get("/products")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it("GET /products?category=iPhones Novos - deve filtrar por categoria", async () => {
      const response = await request(app.getHttpServer())
        .get("/products")
        .query({ category: "iPhones Novos" })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((product) => {
        expect(product.category).toBe("iPhones Novos");
      });
    });

    it("GET /products?isActive=true - deve filtrar produtos ativos", async () => {
      const response = await request(app.getHttpServer())
        .get("/products")
        .query({ isActive: true })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((product) => {
        expect(product.isActive).toBe(true);
      });
    });

    it("GET /products/:id - deve retornar produto específico", async () => {
      if (!createdProductId) {
        return; // Skip se não criou produto
      }

      const response = await request(app.getHttpServer())
        .get(`/products/${createdProductId}`)
        .expect(200);

      expect(response.body.id).toBe(createdProductId);
      expect(response.body.model).toBe("iPhone 15 Pro Test");
    });

    it("PATCH /products/:id - deve atualizar produto", async () => {
      if (!createdProductId) {
        return; // Skip se não criou produto
      }

      const updateData = {
        model: "iPhone 15 Pro Test Updated",
        color: "Preto Espacial",
      };

      const response = await request(app.getHttpServer())
        .patch(`/products/${createdProductId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.model).toBe(updateData.model);
      expect(response.body.color).toBe(updateData.color);
    });

    it("DELETE /products/:id - deve deletar produto", async () => {
      if (!createdProductId) {
        return; // Skip se não criou produto
      }

      await request(app.getHttpServer())
        .delete(`/products/${createdProductId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(204);

      // Verificar se foi deletado
      await request(app.getHttpServer())
        .get(`/products/${createdProductId}`)
        .expect(404);
    });
  });

  describe("Category Endpoints", () => {
    it("GET /products/categories - deve retornar lista de categorias", async () => {
      const response = await request(app.getHttpServer())
        .get("/products/categories")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toContain("iPhones Novos");
      expect(response.body).toContain("iPhones Seminovos");
      expect(response.body).toContain("Macbooks");
    });

    it("GET /products/by-category/:categorySlug - deve retornar produtos por slug", async () => {
      const response = await request(app.getHttpServer())
        .get("/products/by-category/iphones-novos")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("Authentication", () => {
    it("POST /auth/login - deve fazer login com credenciais válidas", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          email: "test@comprefi.com",
          password: "test123456",
        })
        .expect(201);

      expect(response.body).toHaveProperty("access_token");
      expect(response.body).toHaveProperty("user");
      expect(response.body.user.email).toBe("test@comprefi.com");
    });

    it("POST /auth/login - deve rejeitar credenciais inválidas", async () => {
      await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          email: "test@comprefi.com",
          password: "senhaerrada",
        })
        .expect(401);
    });

    it("POST /products - deve rejeitar requisição sem token", async () => {
      await request(app.getHttpServer())
        .post("/products")
        .send({
          model: "Test Product",
          category: "Test Category",
        })
        .expect(401);
    });
  });
});
