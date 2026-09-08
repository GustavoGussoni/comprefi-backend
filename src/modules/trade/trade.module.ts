import { Module } from "@nestjs/common";
import { TradeController } from "./trade.controller";
import { ValorTrocaController } from "./valor-troca.controller";
import { QuestionarioController } from "./questionario.controller";
import { TradeCalculatorService } from "./services/trade-calculator.service";
import { PrismaService } from "../../database/prisma.service";
import { CrmModule } from "../crm/crm.module";
import { TradeLeadService } from "./services/trade-lead.service";
import { QuestionarioAdminService } from "./services/questionario-admin.service";

@Module({
  imports: [CrmModule],
  controllers: [TradeController, ValorTrocaController, QuestionarioController],
  providers: [
    TradeCalculatorService,
    TradeLeadService,
    QuestionarioAdminService,
    PrismaService,
  ],
  exports: [TradeCalculatorService, TradeLeadService],
})
export class TradeModule {}