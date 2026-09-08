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
  const prismaMock = {
    questionarioTroca: {
      findUnique: jest.fn(),
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
    service = new TradeLeadService(
      prismaMock as unknown as PrismaService,
      dataCrazyMock as unknown as DataCrazyService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
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
});
