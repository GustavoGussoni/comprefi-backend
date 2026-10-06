import { PrismaService } from "../../../database/prisma.service";
import { TradeCalculatorService } from "./trade-calculator.service";

describe("TradeCalculatorService sem override público", () => {
  const prismaMock = {
    valorTroca: { findFirst: jest.fn() },
    productVariant: { findUnique: jest.fn() },
    questionarioTroca: { create: jest.fn() },
  };
  let service: TradeCalculatorService;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.valorTroca.findFirst.mockResolvedValue({ valorBase: 2500 });
    prismaMock.productVariant.findUnique.mockResolvedValue({
      id: "variant-1",
      isActive: true,
      storage: "256GB",
      color: "Laranja",
      pixPrice: "R$ 7.332,00",
      installmentPrice: "R$ 696,68",
      originalPrice: "R$ 7.936,00",
      productGroup: { model: "iPhone 17 Pro" },
    });
    prismaMock.questionarioTroca.create.mockResolvedValue({ id: "synthetic" });
    service = new TradeCalculatorService(
      prismaMock as unknown as PrismaService,
    );
  });

  const request = {
    modeloAtual: "iPhone 15",
    capacidadeAtual: "128GB",
    corAtual: "Preto",
    bateriaAtual: 85,
    defeitos: ["nenhum"],
    pecasTrocadas: false,
    modeloDesejado: "variant-1",
  };

  it("não usa um valor manual injetado e ainda produz o cálculo normal", async () => {
    const injectedRequest = { ...request, valorManual: 999999 };
    const result = await service.calculateTrade(injectedRequest);
    expect(result.valorBase).toBe(2500);
    expect(result.valorAparelho).toBe(2100);
    expect(result.valorFinal).toBe(5232);
    expect(prismaMock.valorTroca.findFirst).toHaveBeenCalledWith({
      where: { modelo: "iPhone 15", capacidade: "128GB", ativo: true },
    });
    expect(prismaMock.questionarioTroca.create).toHaveBeenCalledTimes(1);
  });

  it("não cria simulação quando não há valor ativo na tabela", async () => {
    prismaMock.valorTroca.findFirst.mockResolvedValue(null);
    await expect(service.calculateTrade(request)).rejects.toMatchObject({
      status: 422,
      response: { code: "TRADE_VALUE_NOT_FOUND" },
    });
    expect(prismaMock.questionarioTroca.create).not.toHaveBeenCalled();
  });
});
