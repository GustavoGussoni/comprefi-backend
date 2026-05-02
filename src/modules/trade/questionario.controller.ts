import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PrismaService } from "../../database/prisma.service";

@ApiTags("Questionários de Troca (Admin)")
@Controller("trade/questionarios")
export class QuestionarioController {
  constructor(private readonly prisma: PrismaService) {}

  // ========================================
  // GET /trade/questionarios — Listar questionários
  // ========================================
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Listar questionários de troca" })
  @ApiResponse({ status: 200, description: "Lista de questionários retornada" })
  async findAll(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("concluido") concluido?: string,
    @Query("precisaCotacao") precisaCotacao?: string,
    @Query("modeloAtual") modeloAtual?: string,
    @Query("modeloDesejado") modeloDesejado?: string
  ) {
    const pageNum = parseInt(page || "1");
    const limitNum = parseInt(limit || "20");
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (concluido !== undefined) {
      where.concluido = concluido === "true";
    }

    if (precisaCotacao !== undefined) {
      where.precisaCotacao = precisaCotacao === "true";
    }

    if (modeloAtual) {
      where.modeloAtual = { contains: modeloAtual, mode: "insensitive" };
    }

    if (modeloDesejado) {
      where.modeloDesejado = { contains: modeloDesejado, mode: "insensitive" };
    }

    const [questionarios, total] = await Promise.all([
      this.prisma.questionarioTroca.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      this.prisma.questionarioTroca.count({ where }),
    ]);

    return {
      data: questionarios,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  // ========================================
  // GET /trade/questionarios/stats — Estatísticas
  // ========================================
  @Get("stats")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Estatísticas dos questionários" })
  async getStats() {
    const total = await this.prisma.questionarioTroca.count();
    const concluidos = await this.prisma.questionarioTroca.count({
      where: { concluido: true },
    });
    const pendentes = total - concluidos;
    const precisamCotacao = await this.prisma.questionarioTroca.count({
      where: { precisaCotacao: true },
    });

    // Últimos 7 dias
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
    const ultimaSemana = await this.prisma.questionarioTroca.count({
      where: { createdAt: { gte: seteDiasAtras } },
    });

    // Modelos mais desejados
    const modelosDesejados = await this.prisma.questionarioTroca.groupBy({
      by: ["modeloDesejado"],
      _count: { modeloDesejado: true },
      orderBy: { _count: { modeloDesejado: "desc" } },
      take: 5,
    });

    // Modelos mais trocados (atuais)
    const modelosAtuais = await this.prisma.questionarioTroca.groupBy({
      by: ["modeloAtual"],
      _count: { modeloAtual: true },
      orderBy: { _count: { modeloAtual: "desc" } },
      take: 5,
    });

    // Origem (onde ouviu)
    const origens = await this.prisma.questionarioTroca.groupBy({
      by: ["ondeOuviu"],
      _count: { ondeOuviu: true },
      orderBy: { _count: { ondeOuviu: "desc" } },
      take: 5,
    });

    return {
      total,
      concluidos,
      pendentes,
      precisamCotacao,
      ultimaSemana,
      modelosDesejados: modelosDesejados.map((m) => ({
        modelo: m.modeloDesejado,
        count: m._count.modeloDesejado,
      })),
      modelosAtuais: modelosAtuais.map((m) => ({
        modelo: m.modeloAtual,
        count: m._count.modeloAtual,
      })),
      origens: origens.map((o) => ({
        origem: o.ondeOuviu,
        count: o._count.ondeOuviu,
      })),
    };
  }

  // ========================================
  // GET /trade/questionarios/:id — Buscar por ID
  // ========================================
  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Buscar questionário por ID" })
  async findOne(@Param("id") id: string) {
    return this.prisma.questionarioTroca.findUnique({ where: { id } });
  }

  // ========================================
  // PATCH /trade/questionarios/:id — Atualizar (marcar como concluído, etc.)
  // ========================================
  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Atualizar questionário (marcar concluído, adicionar contato)" })
  async update(@Param("id") id: string, @Body() data: any) {
    return this.prisma.questionarioTroca.update({
      where: { id },
      data,
    });
  }

  // ========================================
  // DELETE /trade/questionarios/:id — Deletar
  // ========================================
  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Deletar questionário" })
  async remove(@Param("id") id: string) {
    return this.prisma.questionarioTroca.delete({ where: { id } });
  }
}
