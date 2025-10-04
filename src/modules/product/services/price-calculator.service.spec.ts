// src/modules/product/services/price-calculator.service.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { PriceCalculatorService } from "./price-calculator.service";
import { PrismaService } from "../../../database/prisma.service";

describe("PriceCalculatorService", () => {
  let service: PriceCalculatorService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    priceConfig: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceCalculatorService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PriceCalculatorService>(PriceCalculatorService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("calculatePrices", () => {
    it("deve calcular preços corretamente com valores padrão", async () => {
      // Mock: não encontra configuração, usa valores padrão
      mockPrismaService.priceConfig.findUnique.mockResolvedValue(null);

      const input = {
        cost: 4500,
        freight: 100,
      };

      const result = await service.calculatePrices(input);

      // Cálculos esperados:
      // pixPrice = (4500 + 100) / 0.9 = 5111.11
      // originalPrice = (4500 + 100) / 0.84 = 5476.19
      // installmentPrice = (5111.11 / 0.8651) / 12 = 492.34

      expect(result.rawValues.pixPrice).toBeCloseTo(5111.11, 2);
      expect(result.rawValues.originalPrice).toBeCloseTo(5476.19, 2);
      expect(result.rawValues.installmentPrice).toBeCloseTo(492.34, 2);

      expect(result.pixPrice).toBe("R$ 5111,11");
      expect(result.originalPrice).toBe("R$ 5476,19");
      expect(result.installmentPrice).toBe("R$ 492,34");
    });

    it("deve aplicar frete de R$ 220 para categoria Macbook", async () => {
      mockPrismaService.priceConfig.findUnique.mockResolvedValue(null);

      const input = {
        cost: 8000,
        freight: 100, // Será sobrescrito para 220
        category: "Macbooks",
      };

      const result = await service.calculatePrices(input);

      // Cálculos esperados com frete 220:
      // pixPrice = (8000 + 220) / 0.9 = 9133.33
      // originalPrice = (8000 + 220) / 0.84 = 9785.71

      expect(result.rawValues.pixPrice).toBeCloseTo(9133.33, 2);
      expect(result.rawValues.originalPrice).toBeCloseTo(9785.71, 2);
    });

    it("deve aplicar frete padrão R$ 100 para outras categorias", async () => {
      mockPrismaService.priceConfig.findUnique.mockResolvedValue(null);

      const input = {
        cost: 4500,
        freight: 100,
        category: "iPhones Novos",
      };

      const result = await service.calculatePrices(input);

      // Deve usar frete 100 (padrão)
      expect(result.rawValues.pixPrice).toBeCloseTo(5111.11, 2);
    });

    it("deve usar configuração personalizada quando encontrada", async () => {
      const customConfig = {
        id: "1",
        name: "custom",
        freightValue: 150,
        pixMultiplier: 0.85,
        installmentDiv1: 0.8,
        installmentDiv2: 10,
        originalPricePerc: 1.3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.priceConfig.findUnique.mockResolvedValue(customConfig);

      const input = {
        cost: 5000,
        freight: 150,
        priceConfigName: "custom",
      };

      const result = await service.calculatePrices(input);

      // Cálculos com configuração personalizada:
      // pixPrice = (5000 + 150) / 0.85 = 6058.82
      // originalPrice = (5000 + 150) / 0.84 = 6130.95
      // installmentPrice = (6058.82 / 0.8) / 10 = 757.35

      expect(result.rawValues.pixPrice).toBeCloseTo(6058.82, 2);
      expect(result.rawValues.originalPrice).toBeCloseTo(6130.95, 2);
      expect(result.rawValues.installmentPrice).toBeCloseTo(757.35, 2);
    });

    it("deve formatar valores em reais corretamente", async () => {
      mockPrismaService.priceConfig.findUnique.mockResolvedValue(null);

      const input = {
        cost: 1234.56,
        freight: 100,
      };

      const result = await service.calculatePrices(input);

      // Verifica formatação brasileira (vírgula como separador decimal)
      expect(result.pixPrice).toMatch(/^R\$ \d+,\d{2}$/);
      expect(result.originalPrice).toMatch(/^R\$ \d+,\d{2}$/);
      expect(result.installmentPrice).toMatch(/^R\$ \d+,\d{2}$/);
    });

    it("deve detectar categoria Macbook independente de case", async () => {
      mockPrismaService.priceConfig.findUnique.mockResolvedValue(null);

      const testCases = [
        "Macbooks",
        "MACBOOKS",
        "macbooks",
        "MacBook Pro",
        "macbook air",
      ];

      for (const category of testCases) {
        const input = {
          cost: 5000,
          freight: 100,
          category,
        };

        const result = await service.calculatePrices(input);

        // Deve usar frete 220 para todas as variações
        // pixPrice = (5000 + 220) / 0.9 = 5800
        expect(result.rawValues.pixPrice).toBeCloseTo(5800, 2);
      }
    });
  });

  describe("calculateProductPrices", () => {
    it("deve chamar calculatePrices com parâmetros corretos", async () => {
      mockPrismaService.priceConfig.findUnique.mockResolvedValue(null);

      const spy = jest.spyOn(service, "calculatePrices");

      await service.calculateProductPrices(3000, 120, "custom");

      expect(spy).toHaveBeenCalledWith({
        cost: 3000,
        freight: 120,
        priceConfigName: "custom",
      });
    });
  });
});
