import { ConfigService } from '@nestjs/config';
import {
  DataCrazyDeliveryError,
  DataCrazyService,
} from './datacrazy.service';
import {
  DataCrazyEconomyPayload,
  DataCrazyQuizPayload,
} from './datacrazy.types';

describe('DataCrazyService', () => {
  const originalFetch = global.fetch;
  const getOrThrow = jest.fn();
  const fetchMock = jest.fn();
  let service: DataCrazyService;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as typeof fetch;
    service = new DataCrazyService({ getOrThrow } as unknown as ConfigService);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('envia o quiz somente para a URL configurada no backend', async () => {
    getOrThrow.mockReturnValue('https://crm.example.test/quiz');
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: jest.fn().mockResolvedValue('{"id":"deal-quiz"}'),
    });

    const payload: DataCrazyQuizPayload = {
      nome: 'Cliente Teste',
      whatsapp: '(34) 99999-9999',
      email: 'cliente@example.com',
      category: 'iphone',
      usage: 'pro',
      storage: 'muito',
      recomendacao: 'iPhone Pro',
      fonte: 'quiz-teste-infalivel',
      dataEnvio: '2026-09-08T20:00:00.000Z',
    };

    const receipt = await service.sendCapture('quiz', payload);

    expect(getOrThrow).toHaveBeenCalledWith('DATACRAZY_QUIZ_WEBHOOK_URL');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://crm.example.test/quiz',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    );
    expect(receipt.externalId).toBe('deal-quiz');
  });

  it('envia a captura de economia para seu webhook específico', async () => {
    getOrThrow.mockReturnValue('https://crm.example.test/economia');
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      statusText: 'No Content',
      text: jest.fn().mockResolvedValue(''),
    });

    const payload: DataCrazyEconomyPayload = {
      nome: 'Cliente Teste',
      whatsapp: '(34) 99999-9999',
      produto: 'MacBook',
      fonte: 'economia-captura-suave',
      dataEnvio: '2026-09-08T20:00:00.000Z',
    };

    await service.sendCapture('economia', payload);

    expect(getOrThrow).toHaveBeenCalledWith('DATACRAZY_ECONOMY_WEBHOOK_URL');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://crm.example.test/economia',
      expect.objectContaining({ body: JSON.stringify(payload) }),
    );
  });

  it('não expõe o corpo retornado pelo DataCrazy quando a entrega falha', async () => {
    getOrThrow.mockReturnValue('https://crm.example.test/quiz');
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: jest.fn().mockResolvedValue('detalhes internos e dados pessoais'),
    });

    await expect(
      service.sendCapture('quiz', {
        nome: 'Cliente Teste',
        whatsapp: '(34) 99999-9999',
        email: 'cliente@example.com',
        category: 'iphone',
        usage: 'pro',
        storage: 'muito',
        recomendacao: 'iPhone Pro',
        fonte: 'quiz-teste-infalivel',
        dataEnvio: '2026-09-08T20:00:00.000Z',
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: 'DataCrazyDeliveryError',
        message: 'DataCrazy respondeu HTTP 400 Bad Request',
        statusCode: 400,
      } as Partial<DataCrazyDeliveryError>),
    );
  });
});
