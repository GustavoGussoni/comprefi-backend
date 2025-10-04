"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const price_calculator_service_1 = require("./price-calculator.service");
const prisma_service_1 = require("../../../database/prisma.service");
describe("PriceCalculatorService", () => {
    let service;
    let prismaService;
    const mockPrismaService = {
        priceConfig: {
            findUnique: jest.fn(),
        },
    };
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                price_calculator_service_1.PriceCalculatorService,
                {
                    provide: prisma_service_1.PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();
        service = module.get(price_calculator_service_1.PriceCalculatorService);
        prismaService = module.get(prisma_service_1.PrismaService);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe("calculatePrices", () => {
        it("deve calcular preços corretamente com valores padrão", async () => {
            mockPrismaService.priceConfig.findUnique.mockResolvedValue(null);
            const input = {
                cost: 4500,
                freight: 100,
            };
            const result = await service.calculatePrices(input);
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
                freight: 100,
                category: "Macbooks",
            };
            const result = await service.calculatePrices(input);
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
//# sourceMappingURL=price-calculator.service.spec.js.map