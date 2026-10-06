import { CrmDeliveryStatus, QuestionarioTroca } from '@prisma/client';
import {
  DataCrazyDeliveryError,
  DataCrazyService,
} from '../../crm/datacrazy.service';
import { PrismaService } from '../../../database/prisma.service';
import { TradeLeadService } from './trade-lead.service';

function makeQuestionario(
  overrides: Partial<QuestionarioTroca> = {},
): QuestionarioTroca {
  return {
    id: 'questionario-1',
    modeloAtual: 'iPhone 16 Pro Max',
    capacidadeAtual: '256GB',
    corAtual: 'Titânio Natural',
    bateriaAtual: 85,
    defeitos: [],
    pecasTrocadas: false,
    quaisPecas: '',
    modeloDesejado: 'variant-1',
    produtoDesejadoNome: 'iPhone 17 Pro 256GB Prata',
    ondeOuviu: 'Instagram',
    tempoPensando: 'Há 1 mês',
    urgenciaTroca: 'Agora mesmo',
    valorBase: 5200,
    depreciacaoBateria: 832,
    depreciacaoDefeitos: 0,
    valorAparelho: 4368,
    precoProduto: 7119,
    valorFinal: 2751,
    valorComDesconto: 2668.47,
    descontoPercentual: 3,
    valorManualUsado: false,
    cupomDesconto: 'TROCA30M-TESTE',
    offerExpiresAt: new Date('2026-09-08T20:30:00.000Z'),
    temDefeito: false,
    precisaCotacao: false,
    nome: null,
    email: null,
    whatsapp: null,
    cep: null,
    mensagemFollowUp: null,
    crmStatus: CrmDeliveryStatus.NOT_SENT,
    crmAttempts: 0,
    crmLastAttemptAt: null,
    crmSentAt: null,
    crmLastError: null,
    crmExternalId: null,
    crmExternalUrl: null,
    etapaAtual: 10,
    concluido: false,
    createdAt: new Date('2026-09-08T20:00:00.000Z'),
    updatedAt: new Date('2026-09-08T20:00:00.000Z'),
    ...overrides,
  };
}

describe('TradeLeadService', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const prismaMock = {
    $transaction: jest.fn(),
    questionarioTroca: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const dataCrazyMock = {
    sendTrade: jest.fn(),
  };
  const contact = {
    nome: 'Cliente Teste',
    email: 'cliente@exemplo.com',
    whatsapp: '(34) 99999-9999',
    cep: '38400-000',
    fonte: 'funil-troca',
  };

  let service: TradeLeadService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-09-08T20:10:00.000Z'));
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof prismaMock) => Promise<unknown>) =>
        callback(prismaMock),
    );
    prismaMock.questionarioTroca.findFirst.mockResolvedValue(null);
    service = new TradeLeadService(
      prismaMock as unknown as PrismaService,
      dataCrazyMock as unknown as DataCrazyService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('salva o contato antes do envio e registra sucesso do DataCrazy', async () => {
    const existing = makeQuestionario();
    const pending = makeQuestionario({
      ...contact,
      concluido: true,
      crmStatus: CrmDeliveryStatus.PENDING,
      crmAttempts: 1,
    });
    const sent = makeQuestionario({
      ...contact,
      concluido: true,
      crmStatus: CrmDeliveryStatus.SENT,
      crmAttempts: 1,
      crmSentAt: new Date('2026-09-08T20:10:00.000Z'),
      crmExternalId: 'negocio-1',
    });

    prismaMock.questionarioTroca.findUnique.mockResolvedValue(existing);
    prismaMock.questionarioTroca.update
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce(sent);
    dataCrazyMock.sendTrade.mockResolvedValue({ externalId: 'negocio-1' });

    const result = await service.submitContact('questionario-1', contact);

    expect(prismaMock.questionarioTroca.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'questionario-1' },
      data: expect.objectContaining({
        nome: contact.nome,
        email: contact.email,
        concluido: true,
        crmStatus: CrmDeliveryStatus.PENDING,
      }),
    });
    expect(dataCrazyMock.sendTrade).toHaveBeenCalledWith(
      expect.objectContaining({
        questionarioId: 'questionario-1',
        valorAPagar: 2668.47,
        valorTotal: 7036.47,
        ofertaExpirada: false,
        defeitos: ['nenhum'],
      }),
    );
    expect(result).toMatchObject({
      leadSaved: true,
      crmSent: true,
      crmStatus: CrmDeliveryStatus.SENT,
      offerExpiresAt: '2026-09-08T20:30:00.000Z',
    });
  });

  it('preserva o lead e registra falha quando o DataCrazy não responde', async () => {
    const existing = makeQuestionario();
    const pending = makeQuestionario({
      ...contact,
      concluido: true,
      crmStatus: CrmDeliveryStatus.PENDING,
      crmAttempts: 1,
    });
    const failed = makeQuestionario({
      ...contact,
      concluido: true,
      crmStatus: CrmDeliveryStatus.FAILED,
      crmAttempts: 1,
      crmLastError: 'DataCrazy respondeu HTTP 400',
    });

    prismaMock.questionarioTroca.findUnique.mockResolvedValue(existing);
    prismaMock.questionarioTroca.update
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce(failed);
    dataCrazyMock.sendTrade.mockRejectedValue(
      new DataCrazyDeliveryError('DataCrazy respondeu HTTP 400', 400),
    );

    const result = await service.submitContact('questionario-1', contact);

    expect(result).toMatchObject({
      leadSaved: true,
      crmSent: false,
      crmStatus: CrmDeliveryStatus.FAILED,
    });
    expect(prismaMock.questionarioTroca.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'questionario-1' },
      data: expect.objectContaining({
        crmStatus: CrmDeliveryStatus.FAILED,
        crmLastError: 'DataCrazy respondeu HTTP 400',
      }),
    });
  });

  it('aplica o valor original quando a oferta de 30 minutos expirou', () => {
    jest.setSystemTime(new Date('2026-09-08T20:31:00.000Z'));
    const payload = service.buildPayload(
      makeQuestionario({
        ...contact,
        crmStatus: CrmDeliveryStatus.PENDING,
      }),
    );

    expect(payload.ofertaExpirada).toBe(true);
    expect(payload.valorAPagar).toBe(2751);
    expect(payload.valorTotal).toBe(7119);
    expect(payload.mensagemFollowUp).toContain('valor original aplicado');
  });

  it('ignora simulações anteriores ao marco comercial de staging', async () => {
    process.env.NODE_ENV = 'staging';
    jest.setSystemTime(new Date('2026-10-06T18:00:00.000Z'));
    const newOffer = new Date('2026-10-06T18:30:00.000Z');
    prismaMock.questionarioTroca.findUnique.mockResolvedValue(
      makeQuestionario({
        id: 'nova-simulacao',
        createdAt: new Date('2026-10-06T18:00:00.000Z'),
        offerExpiresAt: newOffer,
      }),
    );
    // Histórico antigo, ou prazo antigo copiado para um teste novo, é ignorado.
    prismaMock.questionarioTroca.findFirst.mockImplementation(
      async ({
        where,
      }: {
        where: { createdAt: { gte: Date }; offerExpiresAt: { gte: Date } };
      }) => {
        expect(where.createdAt.gte).toEqual(
          new Date('2026-10-05T17:54:08.000Z'),
        );
        expect(where.offerExpiresAt.gte).toEqual(
          new Date('2026-10-05T17:54:08.000Z'),
        );
        return null;
      },
    );
    prismaMock.questionarioTroca.update
      .mockResolvedValueOnce(
        makeQuestionario({
          ...contact,
          id: 'nova-simulacao',
          offerExpiresAt: newOffer,
          crmStatus: CrmDeliveryStatus.PENDING,
        }),
      )
      .mockResolvedValueOnce(
        makeQuestionario({
          ...contact,
          id: 'nova-simulacao',
          offerExpiresAt: newOffer,
          crmStatus: CrmDeliveryStatus.FAILED,
        }),
      );
    dataCrazyMock.sendTrade.mockRejectedValue(
      new Error('sem webhook em staging'),
    );

    const result = await service.submitContact('nova-simulacao', contact);

    expect(result.offerExpiresAt).toBe(newOffer.toISOString());
    expect(result.ofertaExpirada).toBe(false);
    expect(prismaMock.questionarioTroca.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({ offerExpiresAt: newOffer }),
      }),
    );
  });

  it('considera a primeira oferta criada após o marco de staging', async () => {
    process.env.NODE_ENV = 'staging';
    jest.setSystemTime(new Date('2026-10-06T18:35:00.000Z'));
    const firstOffer = new Date('2026-10-06T18:30:00.000Z');
    prismaMock.questionarioTroca.findUnique.mockResolvedValue(
      makeQuestionario({
        id: 'segunda-simulacao',
        offerExpiresAt: new Date('2026-10-06T19:05:00.000Z'),
      }),
    );
    prismaMock.questionarioTroca.findFirst.mockImplementation(
      async ({
        where,
      }: {
        where: { createdAt: { gte: Date }; offerExpiresAt: { gte: Date } };
      }) => {
        expect(where.createdAt.gte).toEqual(
          new Date('2026-10-05T17:54:08.000Z'),
        );
        expect(where.offerExpiresAt.gte).toEqual(
          new Date('2026-10-05T17:54:08.000Z'),
        );
        return { offerExpiresAt: firstOffer };
      },
    );
    prismaMock.questionarioTroca.update
      .mockResolvedValueOnce(
        makeQuestionario({
          ...contact,
          id: 'segunda-simulacao',
          offerExpiresAt: firstOffer,
          crmStatus: CrmDeliveryStatus.PENDING,
        }),
      )
      .mockResolvedValueOnce(
        makeQuestionario({
          ...contact,
          id: 'segunda-simulacao',
          offerExpiresAt: firstOffer,
          crmStatus: CrmDeliveryStatus.FAILED,
        }),
      );
    dataCrazyMock.sendTrade.mockRejectedValue(
      new Error('sem webhook em staging'),
    );

    const result = await service.submitContact('segunda-simulacao', contact);

    expect(result.offerExpiresAt).toBe(firstOffer.toISOString());
    expect(result.ofertaExpirada).toBe(true);
    expect(dataCrazyMock.sendTrade).toHaveBeenCalledWith(
      expect.objectContaining({ ofertaExpirada: true, valorAPagar: 2751 }),
    );
  });

  it('mantém a primeira expiração quando o mesmo e-mail recebe outra simulação', async () => {
    const newOffer = new Date('2026-09-08T20:40:00.000Z');
    const firstOffer = new Date('2026-09-08T20:30:00.000Z');
    prismaMock.questionarioTroca.findUnique.mockResolvedValue(
      makeQuestionario({ id: 'questionario-2', offerExpiresAt: newOffer }),
    );
    prismaMock.questionarioTroca.findFirst.mockResolvedValue({
      offerExpiresAt: firstOffer,
    });
    prismaMock.questionarioTroca.update
      .mockImplementationOnce(
        async ({ data }: { data: { offerExpiresAt: Date } }) =>
          makeQuestionario({
            ...contact,
            id: 'questionario-2',
            offerExpiresAt: data.offerExpiresAt,
            crmStatus: CrmDeliveryStatus.PENDING,
          }),
      )
      .mockImplementationOnce(async () =>
        makeQuestionario({
          ...contact,
          id: 'questionario-2',
          offerExpiresAt: firstOffer,
          crmStatus: CrmDeliveryStatus.SENT,
        }),
      );
    dataCrazyMock.sendTrade.mockResolvedValue({});

    const result = await service.submitContact('questionario-2', contact);

    expect(prismaMock.questionarioTroca.findFirst).toHaveBeenCalledWith({
      where: {
        id: { not: 'questionario-2' },
        OR: expect.arrayContaining([
          { email: { equals: contact.email, mode: 'insensitive' } },
        ]),
      },
      orderBy: { createdAt: 'asc' },
      select: { offerExpiresAt: true },
    });
    expect(prismaMock.questionarioTroca.update).toHaveBeenCalledWith({
      where: { id: 'questionario-2' },
      data: expect.objectContaining({ offerExpiresAt: firstOffer }),
    });
    expect(result.offerExpiresAt).toBe(firstOffer.toISOString());
    expect(dataCrazyMock.sendTrade).toHaveBeenCalledWith(
      expect.objectContaining({ ofertaExpirada: false, valorAPagar: 2668.47 }),
    );
  });

  it('não reenvia contato já entregue e corrige seu prazo se havia oferta anterior', async () => {
    const firstOffer = new Date('2026-09-08T20:30:00.000Z');
    prismaMock.questionarioTroca.findUnique.mockResolvedValue(
      makeQuestionario({
        ...contact,
        offerExpiresAt: new Date('2026-09-08T20:40:00.000Z'),
        crmStatus: CrmDeliveryStatus.SENT,
      }),
    );
    prismaMock.questionarioTroca.findFirst.mockResolvedValue({
      offerExpiresAt: firstOffer,
    });
    prismaMock.questionarioTroca.update.mockResolvedValue(
      makeQuestionario({
        ...contact,
        offerExpiresAt: firstOffer,
        crmStatus: CrmDeliveryStatus.SENT,
      }),
    );

    const result = await service.submitContact('questionario-1', contact);

    expect(result.offerExpiresAt).toBe(firstOffer.toISOString());
    expect(prismaMock.questionarioTroca.update).toHaveBeenCalledWith({
      where: { id: 'questionario-1' },
      data: { offerExpiresAt: firstOffer },
    });
    expect(dataCrazyMock.sendTrade).not.toHaveBeenCalled();
  });

  it('aplica o valor original em nova simulação do mesmo WhatsApp após 30 minutos', async () => {
    jest.setSystemTime(new Date('2026-09-08T20:35:00.000Z'));
    const firstOffer = new Date('2026-09-08T20:30:00.000Z');
    prismaMock.questionarioTroca.findUnique.mockResolvedValue(
      makeQuestionario({
        id: 'questionario-2',
        offerExpiresAt: new Date('2026-09-08T21:05:00.000Z'),
      }),
    );
    prismaMock.questionarioTroca.findFirst.mockResolvedValue({
      offerExpiresAt: firstOffer,
    });
    prismaMock.questionarioTroca.update
      .mockImplementationOnce(async () =>
        makeQuestionario({
          ...contact,
          id: 'questionario-2',
          offerExpiresAt: firstOffer,
          crmStatus: CrmDeliveryStatus.PENDING,
        }),
      )
      .mockImplementationOnce(async () =>
        makeQuestionario({
          ...contact,
          id: 'questionario-2',
          offerExpiresAt: firstOffer,
          crmStatus: CrmDeliveryStatus.FAILED,
        }),
      );
    dataCrazyMock.sendTrade.mockRejectedValue(new Error('staging sem webhook'));

    const result = await service.submitContact('questionario-2', {
      ...contact,
      email: 'novo@exemplo.com',
    });

    expect(result).toMatchObject({
      leadSaved: true,
      crmSent: false,
      ofertaExpirada: true,
      offerExpiresAt: firstOffer.toISOString(),
    });
    expect(dataCrazyMock.sendTrade).toHaveBeenCalledWith(
      expect.objectContaining({ ofertaExpirada: true, valorAPagar: 2751 }),
    );
  });
});
