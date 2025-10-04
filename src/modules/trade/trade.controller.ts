import { Controller, Post, Get, Body, Param } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { TradeCalculatorService } from "./services/trade-calculator.service";
import { CalculateTradeDto, TradeResultDto } from "./dto/calculate-trade.dto";

@ApiTags("Trade Calculator")
@Controller("trade")
export class TradeController {
  constructor(
    private readonly tradeCalculatorService: TradeCalculatorService
  ) {}

  @Post("calculate")
  @ApiOperation({ summary: "Calcular valor de troca de iPhone" })
  @ApiResponse({
    status: 200,
    description: "Cálculo realizado com sucesso",
    type: TradeResultDto,
  })
  @ApiResponse({
    status: 400,
    description: "Dados inválidos",
  })
  async calculateTrade(
    @Body() calculateTradeDto: CalculateTradeDto
  ): Promise<TradeResultDto> {
    return this.tradeCalculatorService.calculateTrade(calculateTradeDto);
  }

  @Get("combinations")
  @ApiOperation({ summary: "Obter combinações válidas de modelo e capacidade" })
  @ApiResponse({
    status: 200,
    description: "Combinações válidas retornadas",
  })
  async getValidCombinations() {
    return this.tradeCalculatorService.getValidCombinations();
  }

  @Get("colors/:modelo")
  @ApiOperation({ summary: "Obter cores disponíveis para um modelo" })
  @ApiResponse({
    status: 200,
    description: "Cores disponíveis retornadas",
  })
  async getColorsByModel(@Param("modelo") modelo: string) {
    const colors = await this.tradeCalculatorService.getColorsByModel(modelo);
    return { modelo, colors };
  }

  @Get("defects")
  @ApiOperation({ summary: "Obter lista de defeitos possíveis" })
  @ApiResponse({
    status: 200,
    description: "Lista de defeitos retornada",
  })
  async getDefectsList() {
    return {
      instantCalculation: [
        { id: "nenhum", label: "Nenhum defeito", depreciation: 0 },
        { id: "detalhe_leve", label: "Detalhe leve", depreciation: 200 },
        {
          id: "detalhe_capinha",
          label: "Detalhe de uso de capinha",
          depreciation: 150,
        },
        { id: "risco_tela", label: "Risco na tela", depreciation: 300 },
        { id: "risco_camera", label: "Risco na câmera", depreciation: 400 },
        { id: "amassado", label: "Amassado", depreciation: 400 },
      ],
      manualQuotation: [
        {
          id: "tela_quebrada",
          label: "Tela quebrada",
          note: "Cotação em até 3h",
        },
        {
          id: "camera_quebrada",
          label: "Câmera quebrada",
          note: "Cotação em até 3h",
        },
        {
          id: "faceid_off",
          label: "Face ID não funciona",
          note: "Cotação em até 3h",
        },
        {
          id: "traseira_quebrada",
          label: "Traseira quebrada",
          note: "Cotação em até 3h",
        },
        { id: "outros", label: "Outros defeitos", note: "Cotação em até 3h" },
      ],
    };
  }

  @Get("qualification-options")
  @ApiOperation({ summary: "Obter opções para perguntas de qualificação" })
  @ApiResponse({
    status: 200,
    description: "Opções de qualificação retornadas",
  })
  async getQualificationOptions() {
    return {
      ondeOuviu: [
        "Instagram",
        "TikTok",
        "Facebook",
        "Indicação de amigo",
        "Google",
        "YouTube",
        "Outros",
      ],
      tempoPensando: [
        "Primeira vez que penso nisso",
        "Há algumas semanas",
        "Há 1 mês",
        "Há 2 meses",
        "Há 3 meses ou mais",
      ],
      urgenciaTroca: [
        "Agora mesmo",
        "Na próxima semana",
        "Daqui 2 semanas",
        "Próximo mês",
        "Daqui 2 meses",
        "Daqui 3 meses",
        "Ainda não decidi",
      ],
    };
  }
}
