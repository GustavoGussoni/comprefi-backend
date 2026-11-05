import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentSheetUserGuard } from "./current-sheet-user.guard";
import { SheetTermsDto, SubmitPublicSheetDto } from "./dto/sale-sheet.dto";
import { SaleSheetService } from "./sale-sheet.service";
import type { SheetActor } from "./sale-sheet.types";

type AuthRequest = Request & { user: SheetActor };
@Injectable()
class PrivateSheetHeaders implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const response = context.switchToHttp().getResponse<Response>();
    response.setHeader("Cache-Control", "private, no-store, max-age=0");
    response.setHeader("Pragma", "no-cache");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Content-Type-Options", "nosniff");
    return next.handle();
  }
}
@Controller("ficha-venda")
@UseInterceptors(PrivateSheetHeaders)
export class SaleSheetController {
  constructor(private readonly sheets: SaleSheetService) {}
  @Get("health")
  health() {
    return { status: "ok", crmMode: this.sheets.getDeliveryMode() };
  }

  @Get("catalog")
  @UseGuards(JwtAuthGuard, CurrentSheetUserGuard)
  catalog() {
    return this.sheets.listCatalog();
  }

  @Get("admin")
  @UseGuards(JwtAuthGuard, CurrentSheetUserGuard)
  listAdmin(@Req() request: AuthRequest) {
    return this.sheets.listAdmin(request.user);
  }

  @Post("admin")
  @UseGuards(JwtAuthGuard, CurrentSheetUserGuard)
  create(
    @Req() request: AuthRequest,
    @Body() body: SheetTermsDto,
    @Headers("idempotency-key") key: string,
  ) {
    return this.sheets.create(request.user, body, key);
  }

  @Get("admin/:id")
  @UseGuards(JwtAuthGuard, CurrentSheetUserGuard)
  getAdmin(@Req() request: AuthRequest, @Param("id") id: string) {
    return this.sheets.getAdmin(request.user, id);
  }

  @Post("admin/:id/link")
  @UseGuards(JwtAuthGuard, CurrentSheetUserGuard)
  rotateLink(@Req() request: AuthRequest, @Param("id") id: string) {
    return this.sheets.rotateLink(request.user, id);
  }

  @Post("admin/:id/revoke")
  @UseGuards(JwtAuthGuard, CurrentSheetUserGuard)
  revoke(@Req() request: AuthRequest, @Param("id") id: string) {
    return this.sheets.revokeLink(request.user, id);
  }

  @Get("admin/:id/contract")
  @UseGuards(JwtAuthGuard, CurrentSheetUserGuard)
  async contract(
    @Req() request: AuthRequest,
    @Param("id") id: string,
    @Res() response: Response,
  ): Promise<void> {
    const document = await this.sheets.getContract(request.user, id);
    response
      .status(200)
      .setHeader("Content-Type", "application/pdf")
      .setHeader(
        "Content-Disposition",
        `attachment; filename="${document.filename}"`,
      )
      .send(document.buffer);
  }
  @Post("admin/:id/contract/retry")
  @UseGuards(JwtAuthGuard, CurrentSheetUserGuard)
  retryContract(@Req() request: AuthRequest, @Param("id") id: string) {
    return this.sheets.retryContract(request.user, id);
  }

  @Get("admin/:id/crm-payload")
  @UseGuards(JwtAuthGuard, CurrentSheetUserGuard)
  crmPayload(@Req() request: AuthRequest, @Param("id") id: string) {
    return this.sheets.crmPayload(request.user, id);
  }

  @Post("admin/:id/crm/retry")
  @UseGuards(JwtAuthGuard, CurrentSheetUserGuard)
  retryCrm(@Req() request: AuthRequest, @Param("id") id: string) {
    return this.sheets.retryCrm(request.user, id);
  }

  @Get("public/:token")
  getPublic(@Param("token") token: string) {
    return this.sheets.getPublic(token);
  }

  @Post("public/:token")
  @HttpCode(200)
  submitPublic(
    @Param("token") token: string,
    @Headers("idempotency-key") key: string,
    @Body() body: SubmitPublicSheetDto,
  ) {
    return this.sheets.submitPublic(token, key, body);
  }
}
