import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmDeliveryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { QueryQuestionariosDto } from '../dto/query-questionarios.dto';
import { UpdateQuestionarioAdminDto } from '../dto/update-questionario-admin.dto';
import { TradeLeadService } from './trade-lead.service';

@Injectable()
export class QuestionarioAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tradeLeadService: TradeLeadService,
  ) {}

  async findAll(query: QueryQuestionariosDto) {
    const skip = (query.page - 1) * query.limit;
    const search = query.search?.trim();
    const where: Prisma.QuestionarioTrocaWhereInput = {
      concluido: query.concluido,
      precisaCotacao: query.precisaCotacao,
      crmStatus: query.crmStatus,
      modeloAtual: query.modeloAtual
        ? { contains: query.modeloAtual, mode: 'insensitive' }
        : undefined,
      OR: search
        ? [
            { id: { contains: search, mode: 'insensitive' } },
            { nome: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { whatsapp: { contains: search, mode: 'insensitive' } },
            { modeloAtual: { contains: search, mode: 'insensitive' } },
            {
              produtoDesejadoNome: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ]
        : query.modeloDesejado
          ? [
              {
                modeloDesejado: {
                  contains: query.modeloDesejado,
                  mode: 'insensitive',
                },
              },
              {
                produtoDesejadoNome: {
                  contains: query.modeloDesejado,
                  mode: 'insensitive',
                },
              },
            ]
          : undefined,
    };

    const [data, total] = await Promise.all([
      this.prisma.questionarioTroca.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.questionarioTroca.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getStats() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);

    const [
      total,
      concluidos,
      precisamCotacao,
      falhasCrm,
      enviadosCrm,
      ultimaSemana,
      modelosDesejados,
      modelosAtuais,
      origens,
      recentRecords,
    ] = await Promise.all([
      this.prisma.questionarioTroca.count(),
      this.prisma.questionarioTroca.count({ where: { concluido: true } }),
      this.prisma.questionarioTroca.count({
        where: { precisaCotacao: true },
      }),
      this.prisma.questionarioTroca.count({
        where: { crmStatus: CrmDeliveryStatus.FAILED },
      }),
      this.prisma.questionarioTroca.count({
        where: { crmStatus: CrmDeliveryStatus.SENT },
      }),
      this.prisma.questionarioTroca.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.questionarioTroca.groupBy({
        by: ['produtoDesejadoNome'],
        _count: { produtoDesejadoNome: true },
        orderBy: { _count: { produtoDesejadoNome: 'desc' } },
        take: 5,
      }),
      this.prisma.questionarioTroca.groupBy({
        by: ['modeloAtual'],
        _count: { modeloAtual: true },
        orderBy: { _count: { modeloAtual: 'desc' } },
        take: 5,
      }),
      this.prisma.questionarioTroca.groupBy({
        by: ['ondeOuviu'],
        _count: { ondeOuviu: true },
        orderBy: { _count: { ondeOuviu: 'desc' } },
        take: 5,
      }),
      this.prisma.questionarioTroca.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: {
          createdAt: true,
          concluido: true,
          crmStatus: true,
        },
      }),
    ]);

    const chart = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(sevenDaysAgo);
      date.setUTCDate(date.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      const records = recentRecords.filter(
        (record) => record.createdAt.toISOString().slice(0, 10) === key,
      );

      return {
        date: key,
        simulacoes: records.length,
        formularios: records.filter((record) => record.concluido).length,
        enviadosCrm: records.filter(
          (record) => record.crmStatus === CrmDeliveryStatus.SENT,
        ).length,
      };
    });

    return {
      total,
      concluidos,
      pendentes: total - concluidos,
      precisamCotacao,
      falhasCrm,
      enviadosCrm,
      ultimaSemana,
      modelosDesejados: modelosDesejados
        .filter((item) => item.produtoDesejadoNome)
        .map((item) => ({
          modelo: item.produtoDesejadoNome,
          count: item._count.produtoDesejadoNome,
        })),
      modelosAtuais: modelosAtuais.map((item) => ({
        modelo: item.modeloAtual,
        count: item._count.modeloAtual,
      })),
      origens: origens.map((item) => ({
        origem: item.ondeOuviu,
        count: item._count.ondeOuviu,
      })),
      simulacoesECapturas: chart,
    };
  }

  async findOne(id: string) {
    const questionario = await this.prisma.questionarioTroca.findUnique({
      where: { id },
    });

    if (!questionario) {
      throw new NotFoundException('Simulação não encontrada');
    }

    return questionario;
  }

  async update(id: string, data: UpdateQuestionarioAdminDto) {
    await this.findOne(id);
    return this.prisma.questionarioTroca.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.questionarioTroca.delete({ where: { id } });
  }

  async getPayload(id: string) {
    const questionario = await this.findOne(id);
    return this.tradeLeadService.buildPayload(questionario);
  }

  async resend(id: string) {
    return this.tradeLeadService.resend(id);
  }
}
