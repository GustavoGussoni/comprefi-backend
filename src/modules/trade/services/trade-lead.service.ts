import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmDeliveryStatus, Prisma, QuestionarioTroca } from '@prisma/client';
import {
  DataCrazyDeliveryError,
  DataCrazyService,
} from '../../crm/datacrazy.service';
import { DataCrazyTradePayload } from '../../crm/datacrazy.types';
import { PrismaService } from '../../../database/prisma.service';
import { SubmitTradeContactDto } from '../dto/submit-trade-contact.dto';

export interface TradeContactSubmissionResult {
  questionarioId: string;
  leadSaved: true;
  crmSent: boolean;
  crmStatus: CrmDeliveryStatus;
  ofertaExpirada: boolean;
  offerExpiresAt: string | null;
}

@Injectable()
export class TradeLeadService {
  // Marco exclusivo de staging: simulações anteriores foram criadas em testes.
  // Não aplicar este corte em produção sem uma decisão comercial separada.
  private static readonly STAGING_OFFER_START_AT = new Date(
    '2026-10-05T17:54:08.000Z',
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly dataCrazyService: DataCrazyService,
  ) {}

  async submitContact(
    questionarioId: string,
    contact: SubmitTradeContactDto,
  ): Promise<TradeContactSubmissionResult> {
    // A identidade só é conhecida no envio do contato. Uma nova simulação pode
    // ter outro prazo, mas não pode renovar a primeira oferta do mesmo contato.
    // Serializable evita que dois envios simultâneos aceitem ambos um prazo novo.
    let saved:
      | { questionario: QuestionarioTroca; alreadySent: boolean }
      | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        saved = await this.prisma.$transaction(
          async (tx) => {
            const existing = await tx.questionarioTroca.findUnique({
              where: { id: questionarioId },
            });
            if (!existing) {
              throw new NotFoundException('Simulação não encontrada');
            }

            const sameContact =
              existing.nome === contact.nome &&
              existing.email === contact.email &&
              existing.whatsapp === contact.whatsapp &&
              existing.cep === contact.cep;
            const digits = contact.whatsapp.replace(/\D/g, '');
            const local = digits.slice(2);
            const phones = Array.from(
              new Set([
                contact.whatsapp,
                digits,
                `(${digits.slice(0, 2)}) ${local.slice(0, -4)}-${local.slice(-4)}`,
                `${digits.slice(0, 2)} ${local.slice(0, -4)}-${local.slice(-4)}`,
              ]),
            );
            const prior = await tx.questionarioTroca.findFirst({
              where: {
                id: { not: questionarioId },
                precisaCotacao: false,
                ...(process.env.NODE_ENV === 'staging'
                  ? {
                      createdAt: {
                        gte: TradeLeadService.STAGING_OFFER_START_AT,
                      },
                      offerExpiresAt: {
                        gte: TradeLeadService.STAGING_OFFER_START_AT,
                      },
                    }
                  : { offerExpiresAt: { not: null } }),
                OR: [
                  {
                    email: {
                      equals: contact.email.trim(),
                      mode: 'insensitive',
                    },
                  },
                  { whatsapp: { in: phones } },
                ],
              },
              orderBy: { createdAt: 'asc' },
              select: { offerExpiresAt: true },
            });
            const offerExpiresAt = existing.precisaCotacao
              ? null
              : prior
                ? !existing.offerExpiresAt || !prior.offerExpiresAt
                  ? null
                  : existing.offerExpiresAt < prior.offerExpiresAt
                    ? existing.offerExpiresAt
                    : prior.offerExpiresAt
                : existing.offerExpiresAt;

            if (existing.crmStatus === CrmDeliveryStatus.SENT && sameContact) {
              const persisted =
                offerExpiresAt?.getTime() === existing.offerExpiresAt?.getTime()
                  ? existing
                  : await tx.questionarioTroca.update({
                      where: { id: questionarioId },
                      data: { offerExpiresAt },
                    });
              return { questionario: persisted, alreadySent: true };
            }

            const questionario = await tx.questionarioTroca.update({
              where: { id: questionarioId },
              data: {
                nome: contact.nome,
                email: contact.email,
                whatsapp: contact.whatsapp,
                cep: contact.cep,
                offerExpiresAt,
                concluido: true,
                crmStatus: CrmDeliveryStatus.PENDING,
                crmAttempts: { increment: 1 },
                crmLastAttemptAt: new Date(),
                crmLastError: null,
              },
            });
            return { questionario, alreadySent: false };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        break;
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== 'P2034' ||
          attempt === 2
        ) {
          throw error;
        }
      }
    }

    if (!saved) throw new Error('Não foi possível salvar a simulação');
    if (saved.alreadySent)
      return this.toSubmissionResult(saved.questionario, true);
    return this.deliver(saved.questionario, contact.fonte);
  }

  async resend(questionarioId: string): Promise<TradeContactSubmissionResult> {
    const existing = await this.prisma.questionarioTroca.findUnique({
      where: { id: questionarioId },
    });

    if (!existing) {
      throw new NotFoundException('Simulação não encontrada');
    }

    if (
      !existing.nome ||
      !existing.email ||
      !existing.whatsapp ||
      !existing.cep
    ) {
      throw new Error('A simulação ainda não possui contato completo');
    }

    const questionario = await this.prisma.questionarioTroca.update({
      where: { id: questionarioId },
      data: {
        crmStatus: CrmDeliveryStatus.PENDING,
        crmAttempts: { increment: 1 },
        crmLastAttemptAt: new Date(),
        crmLastError: null,
      },
    });

    return this.deliver(questionario, 'funil-troca');
  }

  buildPayload(
    questionario: QuestionarioTroca,
    fonte = 'funil-troca',
  ): DataCrazyTradePayload {
    const now = new Date();
    const manual = questionario.precisaCotacao;
    const ofertaExpirada =
      !manual &&
      (!questionario.offerExpiresAt || questionario.offerExpiresAt <= now);
    const valorAparelho = this.money(questionario.valorAparelho);
    const valorFinal = this.money(questionario.valorFinal);
    const valorComDesconto = this.money(questionario.valorComDesconto);
    const valorAPagar = ofertaExpirada ? valorFinal : valorComDesconto;
    const defeitos = this.readDefects(questionario.defeitos);
    const modeloDesejado =
      questionario.produtoDesejadoNome ?? questionario.modeloDesejado;
    const mensagemFollowUp = this.buildFollowUpMessage({
      questionario,
      modeloDesejado,
      valorAparelho,
      valorAPagar,
      ofertaExpirada,
      now,
    });

    return {
      cep: questionario.cep ?? '',
      nome: questionario.nome ?? '',
      email: questionario.email ?? '',
      fonte,
      corAtual: questionario.corAtual,
      defeitos: defeitos.length > 0 ? defeitos : ['nenhum'],
      whatsapp: questionario.whatsapp ?? '',
      dataEnvio: now.toISOString(),
      ondeOuviu: questionario.ondeOuviu ?? '',
      quaisPecas: questionario.quaisPecas ?? '',
      modeloAtual: questionario.modeloAtual,
      bateriaAtual: questionario.bateriaAtual,
      cupomDesconto: manual ? '' : (questionario.cupomDesconto ?? ''),
      pecasTrocadas: questionario.pecasTrocadas,
      tempoPensando: questionario.tempoPensando ?? '',
      urgenciaTroca: questionario.urgenciaTroca ?? '',
      modeloDesejado,
      precisaCotacao: manual,
      capacidadeAtual: questionario.capacidadeAtual,
      mensagemFollowUp,
      questionarioId: questionario.id,
      offerExpiresAt: manual
        ? ''
        : (questionario.offerExpiresAt?.toISOString() ?? ''),
      ofertaExpirada,
      ...(!manual && {
        valorBase: this.money(questionario.valorBase),
        valorFinal,
        valorTotal: this.money(valorAPagar + valorAparelho),
        valorAparelho,
        valorComDesconto,
        depreciacaoBateria: this.money(questionario.depreciacaoBateria),
        depreciacaoDefeitos: this.money(questionario.depreciacaoDefeitos),
        valorAPagar,
      }),
    };
  }

  private async deliver(
    questionario: QuestionarioTroca,
    fonte: string,
  ): Promise<TradeContactSubmissionResult> {
    const payload = this.buildPayload(questionario, fonte);

    try {
      const receipt = await this.dataCrazyService.sendTrade(payload);
      const updated = await this.prisma.questionarioTroca.update({
        where: { id: questionario.id },
        data: {
          mensagemFollowUp: payload.mensagemFollowUp,
          crmStatus: CrmDeliveryStatus.SENT,
          crmSentAt: new Date(),
          crmLastError: null,
          crmExternalId: receipt.externalId,
          crmExternalUrl: receipt.externalUrl,
        },
      });

      return this.toSubmissionResult(updated, true);
    } catch (error: unknown) {
      const message = this.sanitizeDeliveryError(error);
      const updated = await this.prisma.questionarioTroca.update({
        where: { id: questionario.id },
        data: {
          mensagemFollowUp: payload.mensagemFollowUp,
          crmStatus: CrmDeliveryStatus.FAILED,
          crmLastError: message,
        },
      });

      return this.toSubmissionResult(updated, false);
    }
  }

  private toSubmissionResult(
    questionario: QuestionarioTroca,
    crmSent: boolean,
  ): TradeContactSubmissionResult {
    const ofertaExpirada =
      !questionario.precisaCotacao &&
      (!questionario.offerExpiresAt ||
        questionario.offerExpiresAt <= new Date());

    return {
      questionarioId: questionario.id,
      leadSaved: true,
      crmSent,
      crmStatus: questionario.crmStatus,
      ofertaExpirada,
      offerExpiresAt: questionario.offerExpiresAt?.toISOString() ?? null,
    };
  }

  private readDefects(value: QuestionarioTroca['defeitos']): string[] {
    if (!Array.isArray(value)) return [];

    return value.filter(
      (item): item is string =>
        typeof item === 'string' && item.length > 0 && item !== 'nenhum',
    );
  }

  private money(value: number | null | undefined): number {
    const number = value ?? 0;
    return Math.round((number + Number.EPSILON) * 100) / 100;
  }

  private sanitizeDeliveryError(error: unknown): string {
    const message =
      error instanceof DataCrazyDeliveryError
        ? error.message
        : 'Falha desconhecida ao enviar ao DataCrazy';

    return message.slice(0, 240);
  }

  private buildFollowUpMessage(input: {
    questionario: QuestionarioTroca;
    modeloDesejado: string;
    valorAparelho: number;
    valorAPagar: number;
    ofertaExpirada: boolean;
    now: Date;
  }): string {
    const { questionario } = input;
    if (questionario.precisaCotacao) {
      return [
        'SOLICITAÇÃO DE COTAÇÃO MANUAL — CompreFi',
        `Cliente: ${questionario.nome ?? ''}`,
        `Email: ${questionario.email ?? ''}`,
        `WhatsApp: ${questionario.whatsapp ?? ''}`,
        `CEP: ${questionario.cep ?? ''}`,
        '',
        `De: ${questionario.modeloAtual} ${questionario.capacidadeAtual}`,
        `Para: ${input.modeloDesejado}`,
        'Crédito pelo aparelho e diferença a pagar: aguardando avaliação individual.',
        'Sem preço final, desconto ou prazo de oferta confirmado.',
        `Formulário enviado em: ${input.now.toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
        })}`,
      ].join('\n');
    }
    const condition = input.ofertaExpirada
      ? 'Oferta de 3% expirada; valor original aplicado.'
      : `Oferta de 3% ativa até ${questionario.offerExpiresAt?.toLocaleString(
          'pt-BR',
          { timeZone: 'America/Sao_Paulo' },
        )}.`;

    return [
      'SOLICITAÇÃO DE TROCA — CompreFi',
      `Cliente: ${questionario.nome ?? ''}`,
      `Email: ${questionario.email ?? ''}`,
      `WhatsApp: ${questionario.whatsapp ?? ''}`,
      `CEP: ${questionario.cep ?? ''}`,
      '',
      `De: ${questionario.modeloAtual} ${questionario.capacidadeAtual}`,
      `Para: ${input.modeloDesejado}`,
      '',
      `Valor do aparelho: ${this.formatCurrency(input.valorAparelho)}`,
      `Valor a pagar: ${this.formatCurrency(input.valorAPagar)}`,
      condition,
      `Cupom: ${questionario.cupomDesconto ?? ''}`,
      `Formulário enviado em: ${input.now.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
      })}`,
    ].join('\n');
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }
}
