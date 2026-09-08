import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmDeliveryStatus, QuestionarioTroca } from '@prisma/client';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataCrazyService: DataCrazyService,
  ) {}

  async submitContact(
    questionarioId: string,
    contact: SubmitTradeContactDto,
  ): Promise<TradeContactSubmissionResult> {
    const existing = await this.prisma.questionarioTroca.findUnique({
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

    if (existing.crmStatus === CrmDeliveryStatus.SENT && sameContact) {
      return this.toSubmissionResult(existing, true);
    }

    const questionario = await this.prisma.questionarioTroca.update({
      where: { id: questionarioId },
      data: {
        nome: contact.nome,
        email: contact.email,
        whatsapp: contact.whatsapp,
        cep: contact.cep,
        concluido: true,
        crmStatus: CrmDeliveryStatus.PENDING,
        crmAttempts: { increment: 1 },
        crmLastAttemptAt: new Date(),
        crmLastError: null,
      },
    });

    return this.deliver(questionario, contact.fonte);
  }

  async resend(questionarioId: string): Promise<TradeContactSubmissionResult> {
    const existing = await this.prisma.questionarioTroca.findUnique({
      where: { id: questionarioId },
    });

    if (!existing) {
      throw new NotFoundException('Simulação não encontrada');
    }

    if (!existing.nome || !existing.email || !existing.whatsapp || !existing.cep) {
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
    const ofertaExpirada =
      !questionario.offerExpiresAt || questionario.offerExpiresAt <= now;
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
      valorBase: this.money(questionario.valorBase),
      quaisPecas: questionario.quaisPecas ?? '',
      valorFinal,
      valorTotal: this.money(valorAPagar + valorAparelho),
      modeloAtual: questionario.modeloAtual,
      bateriaAtual: questionario.bateriaAtual,
      cupomDesconto: questionario.cupomDesconto ?? '',
      pecasTrocadas: questionario.pecasTrocadas,
      tempoPensando: questionario.tempoPensando ?? '',
      urgenciaTroca: questionario.urgenciaTroca ?? '',
      valorAparelho,
      modeloDesejado,
      precisaCotacao: questionario.precisaCotacao,
      capacidadeAtual: questionario.capacidadeAtual,
      mensagemFollowUp,
      valorComDesconto,
      depreciacaoBateria: this.money(questionario.depreciacaoBateria),
      depreciacaoDefeitos: this.money(questionario.depreciacaoDefeitos),
      questionarioId: questionario.id,
      offerExpiresAt: questionario.offerExpiresAt?.toISOString() ?? '',
      ofertaExpirada,
      valorAPagar,
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
      !questionario.offerExpiresAt || questionario.offerExpiresAt <= new Date();

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
