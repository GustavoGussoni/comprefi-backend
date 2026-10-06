import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { IsString, IsNumber, IsOptional, IsBoolean } from "class-validator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { PrismaService } from "../../database/prisma.service";

// DTOs com validação
class CreateValorTrocaDto {
  @IsString()
  modelo: string;

  @IsString()
  capacidade: string;

  @IsNumber()
  valorBase: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

class UpdateValorTrocaDto {
  @IsOptional()
  @IsString()
  modelo?: string;

  @IsOptional()
  @IsString()
  capacidade?: string;

  @IsOptional()
  @IsNumber()
  valorBase?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

@ApiTags("Valores de Troca (Admin)")
@Controller("trade/valores")
export class ValorTrocaController {
  constructor(private readonly prisma: PrismaService) {}

  // ========================================
  // GET /trade/valores — Listar todos os valores
  // ========================================
  @Get()
  @ApiOperation({ summary: "Listar todos os valores de troca" })
  @ApiResponse({ status: 200, description: "Lista de valores retornada" })
  async findAll(
    @Query("modelo") modelo?: string,
    @Query("ativo") ativo?: string
  ) {
    const where: any = {};

    if (modelo) {
      where.modelo = { contains: modelo, mode: "insensitive" };
    }

    if (ativo !== undefined) {
      where.ativo = ativo === "true";
    }

    const valores = await this.prisma.valorTroca.findMany({
      where,
      orderBy: [{ modelo: "asc" }, { capacidade: "asc" }],
    });

    return valores;
  }

  // ========================================
  // GET /trade/valores/stats — Estatísticas
  // ========================================
  @Get("stats")
  @ApiOperation({ summary: "Estatísticas dos valores de troca" })
  async getStats() {
    const total = await this.prisma.valorTroca.count();
    const ativos = await this.prisma.valorTroca.count({ where: { ativo: true } });
    const inativos = total - ativos;

    const modelos = await this.prisma.valorTroca.groupBy({
      by: ["modelo"],
      _count: { modelo: true },
      where: { ativo: true },
    });

    return {
      total,
      ativos,
      inativos,
      totalModelos: modelos.length,
    };
  }

  // ========================================
  // GET /trade/valores/:id — Buscar por ID
  // ========================================
  @Get(":id")
  @ApiOperation({ summary: "Buscar valor de troca por ID" })
  async findOne(@Param("id") id: string) {
    return this.prisma.valorTroca.findUnique({ where: { id } });
  }

  // ========================================
  // POST /trade/valores — Criar novo valor
  // ========================================
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Criar novo valor de troca" })
  @ApiResponse({ status: 201, description: "Valor criado com sucesso" })
  @ApiResponse({ status: 400, description: "Dados inválidos" })
  async create(@Body() data: CreateValorTrocaDto) {
    return this.prisma.valorTroca.create({
      data: {
        modelo: data.modelo,
        capacidade: data.capacidade,
        valorBase: data.valorBase,
        ativo: data.ativo ?? true,
      },
    });
  }

  // ========================================
  // POST /trade/valores/bulk — Criar/atualizar em lote
  // ========================================
  @Post("bulk")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Criar ou atualizar valores em lote (upsert)" })
  async bulkUpsert(@Body() data: CreateValorTrocaDto[]) {
    const results = [];

    for (const item of data) {
      const result = await this.prisma.valorTroca.upsert({
        where: {
          modelo_capacidade: {
            modelo: item.modelo,
            capacidade: item.capacidade,
          },
        },
        update: {
          valorBase: item.valorBase,
          ativo: item.ativo ?? true,
        },
        create: {
          modelo: item.modelo,
          capacidade: item.capacidade,
          valorBase: item.valorBase,
          ativo: item.ativo ?? true,
        },
      });
      results.push(result);
    }

    return { count: results.length, results };
  }

  // ========================================
  // PATCH /trade/valores/:id — Atualizar valor
  // ========================================
  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Atualizar valor de troca" })
  @ApiResponse({ status: 200, description: "Valor atualizado com sucesso" })
  async update(@Param("id") id: string, @Body() data: UpdateValorTrocaDto) {
    return this.prisma.valorTroca.update({
      where: { id },
      data,
    });
  }

  // ========================================
  // DELETE /trade/valores/:id — Deletar valor
  // ========================================
  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Deletar valor de troca" })
  @ApiResponse({ status: 200, description: "Valor deletado com sucesso" })
  async remove(@Param("id") id: string) {
    return this.prisma.valorTroca.delete({ where: { id } });
  }
}
