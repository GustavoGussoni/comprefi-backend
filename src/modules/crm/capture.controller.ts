import {
  BadGatewayException,
  Body,
  Controller,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DataCrazyService } from './datacrazy.service';
import {
  DataCrazyCaptureKind,
  DataCrazyCapturePayload,
} from './datacrazy.types';
import {
  SubmitEconomyCaptureDto,
  SubmitQuizCaptureDto,
} from './dto/submit-capture.dto';

@ApiTags('Capturas')
@Controller('crm/captures')
export class CaptureController {
  constructor(private readonly dataCrazyService: DataCrazyService) {}

  @Post('quiz')
  @ApiOperation({ summary: 'Enviar captura do Teste Infalível ao CRM' })
  @ApiResponse({ status: 201, description: 'Captura entregue ao CRM' })
  async submitQuiz(@Body() data: SubmitQuizCaptureDto) {
    return this.deliver('quiz', {
      nome: data.nome,
      whatsapp: data.whatsapp,
      email: data.email,
      category: data.category,
      usage: data.usage,
      storage: data.storage,
      ...(data.screenSize ? { screenSize: data.screenSize } : {}),
      recomendacao: data.recomendacao,
      fonte: 'quiz-teste-infalivel',
      dataEnvio: new Date().toISOString(),
    });
  }

  @Post('economia')
  @ApiOperation({ summary: 'Enviar captura da página Economia Real ao CRM' })
  @ApiResponse({ status: 201, description: 'Captura entregue ao CRM' })
  async submitEconomy(@Body() data: SubmitEconomyCaptureDto) {
    return this.deliver('economia', {
      nome: data.nome,
      whatsapp: data.whatsapp,
      produto: data.produto,
      fonte: 'economia-captura-suave',
      dataEnvio: new Date().toISOString(),
    });
  }

  private async deliver(
    kind: DataCrazyCaptureKind,
    payload: DataCrazyCapturePayload,
  ) {
    try {
      const receipt = await this.dataCrazyService.sendCapture(kind, payload);
      return {
        sent: true,
        externalId: receipt.externalId,
        externalUrl: receipt.externalUrl,
      };
    } catch {
      throw new BadGatewayException(
        'Não foi possível registrar seus dados agora. Tente novamente em instantes.',
      );
    }
  }
}
