import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { QueryQuestionariosDto } from './dto/query-questionarios.dto';
import { UpdateQuestionarioAdminDto } from './dto/update-questionario-admin.dto';
import { QuestionarioAdminService } from './services/questionario-admin.service';

@ApiTags('Simulações e CRM (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SALES)
@Controller('trade/questionarios')
export class QuestionarioController {
  constructor(
    private readonly questionarioAdminService: QuestionarioAdminService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar simulações e estado técnico do CRM' })
  @ApiResponse({ status: 200, description: 'Lista paginada retornada' })
  findAll(@Query() query: QueryQuestionariosDto) {
    return this.questionarioAdminService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estatísticas de simulações e entregas ao CRM' })
  getStats() {
    return this.questionarioAdminService.getStats();
  }

  @Get(':id/payload')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Visualizar payload do DataCrazy' })
  @ApiResponse({ status: 403, description: 'Disponível apenas para Gustavo' })
  getPayload(@Param('id') id: string) {
    return this.questionarioAdminService.getPayload(id);
  }

  @Post(':id/resend')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reenviar uma simulação com contato ao DataCrazy' })
  resend(@Param('id') id: string) {
    return this.questionarioAdminService.resend(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar detalhes de uma simulação' })
  findOne(@Param('id') id: string) {
    return this.questionarioAdminService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar campos administrativos permitidos' })
  update(
    @Param('id') id: string,
    @Body() data: UpdateQuestionarioAdminDto,
  ) {
    return this.questionarioAdminService.update(id, data);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Excluir uma simulação' })
  remove(@Param('id') id: string) {
    return this.questionarioAdminService.remove(id);
  }
}
