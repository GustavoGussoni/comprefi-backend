import { ValidationPipe } from '@nestjs/common';
import { CalculateTradeDto } from './calculate-trade.dto';

describe('CalculateTradeDto (requisição pública)', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const metadata = { type: 'body' as const, metatype: CalculateTradeDto };
  const validRequest = {
    modeloAtual: 'iPhone 15',
    capacidadeAtual: '128GB',
    corAtual: 'Preto',
    bateriaAtual: 85,
    defeitos: ['nenhum'],
    pecasTrocadas: false,
    modeloDesejado: 'variant-1',
  };

  it('aceita o cálculo comum do funil sem valor manual', async () => {
    await expect(pipe.transform(validRequest, metadata)).resolves.toMatchObject(
      validRequest,
    );
  });

  it('rejeita o valor-base arbitrário enviado por cliente antes de calcular', async () => {
    await expect(
      pipe.transform({ ...validRequest, valorManual: 999999 }, metadata),
    ).rejects.toMatchObject({
      status: 400,
      response: {
        message: expect.arrayContaining([
          expect.stringContaining('valorManual'),
        ]),
      },
    });
  });
});
