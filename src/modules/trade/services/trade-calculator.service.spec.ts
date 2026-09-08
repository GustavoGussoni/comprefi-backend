import { PrismaService } from '../../../database/prisma.service';
import { TradeCalculatorService } from './trade-calculator.service';

describe('TradeCalculatorService', () => {
  const prismaMock = {
    valorTroca: {
      findFirst: jest.fn(),
    },
    productVariant: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
    },
    questionarioTroca: {
      create: jest.fn(),
    },
  };

  let service: TradeCalculatorService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-09-08T20:00:00.000Z'));

    prismaMock.valorTroca.findFirst.mockResolvedValue({ valorBase: 3400 });
    prismaMock.productVariant.findUnique.mockResolvedValue({
      id: 'variant-1',
      storage: '256GB',
      color: 'Titânio Natural',
      pixPrice: 'R$ 7.666,67',
      installmentPrice: 'R$ 738,51',
      originalPrice: 'R$ 8.214,29',
      isActive: true,
      productGroup: {
        model: 'iPhone 16 Pro Max',
      },
    });
    prismaMock.questionarioTroca.create.mockResolvedValue({
      id: 'questionario-1',
    });

    service = new TradeCalculatorService(
      prismaMock as unknown as PrismaService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('normaliza nenhum defeito e cria oferta auditável de 30 minutos', async () => {
    const result = await service.calculateTrade({
      modeloAtual: 'iPhone 14 Plus',
      capacidadeAtual: '128GB',
      corAtual: 'Preto',
      bateriaAtual: 85,
      defeitos: ['nenhum'],
      pecasTrocadas: false,
      modeloDesejado: 'variant-1',
    });

    expect(result).toMatchObject({
      questionarioId: 'questionario-1',
      offerExpiresAt: '2026-09-08T20:30:00.000Z',
      descontoPercentual: 3,
      valorBase: 3400,
      depreciacaoBateria: 544,
      depreciacaoDefeitos: 0,
      valorAparelho: 2856,
      precoProduto: 7666.67,
      valorFinal: 4810.67,
      valorComDesconto: 4666.35,
      temDefeito: false,
      precisaCotacao: false,
      valorManualUsado: false,
    });
    expect(result.cupomDesconto).toMatch(/^TROCA30M-/);
    expect(prismaMock.questionarioTroca.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        defeitos: [],
        temDefeito: false,
        precisaCotacao: false,
        offerExpiresAt: new Date('2026-09-08T20:30:00.000Z'),
        valorComDesconto: 4666.35,
      }),
    });
  });

  it('marca defeito grave como cotação manual e persiste a flag correta', async () => {
    const result = await service.calculateTrade({
      modeloAtual: 'iPhone 14 Plus',
      capacidadeAtual: '128GB',
      corAtual: 'Preto',
      bateriaAtual: 85,
      defeitos: ['tela_quebrada'],
      pecasTrocadas: false,
      modeloDesejado: 'variant-1',
    });

    expect(result.temDefeito).toBe(true);
    expect(result.precisaCotacao).toBe(true);
    expect(prismaMock.questionarioTroca.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        defeitos: ['tela_quebrada'],
        temDefeito: true,
        precisaCotacao: true,
      }),
    });
  });
});
