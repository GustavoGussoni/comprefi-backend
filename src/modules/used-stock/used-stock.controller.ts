import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CurrentUsedStockUserGuard } from "./current-used-stock-user.guard";
import {
  ActivateUsedStockDto,
  CreateUsedStockDto,
  PatchUsedStockDto,
  TransitionUsedStockDto,
} from "./used-stock.dto";
import { UsedStockService, type UsedStockActor } from "./used-stock.service";

const NO_STORE = "no-store";

type AuthenticatedRequest = { user: UsedStockActor };

@Controller("used-stock")
export class UsedStockController {
  constructor(private readonly usedStock: UsedStockService) {}

  @Get("public")
  @Header("Cache-Control", NO_STORE)
  listPublic() {
    return this.usedStock.listPublic();
  }

  @Get("public/:id")
  @Header("Cache-Control", NO_STORE)
  getPublic(@Param("id") id: string) {
    return this.usedStock.getPublic(id);
  }

  @Get("admin")
  @Header("Cache-Control", NO_STORE)
  @UseGuards(JwtAuthGuard, RolesGuard, CurrentUsedStockUserGuard)
  @Roles(UserRole.ADMIN, UserRole.SALES)
  listAdmin() {
    return this.usedStock.listAdmin();
  }

  @Post("admin")
  @Header("Cache-Control", NO_STORE)
  @UseGuards(JwtAuthGuard, RolesGuard, CurrentUsedStockUserGuard)
  @Roles(UserRole.ADMIN, UserRole.SALES)
  create(@Request() request: AuthenticatedRequest, @Body() body: CreateUsedStockDto) {
    return this.usedStock.create(request.user, body);
  }

  @Patch("admin/:id")
  @Header("Cache-Control", NO_STORE)
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard, CurrentUsedStockUserGuard)
  @Roles(UserRole.ADMIN, UserRole.SALES)
  patch(
    @Request() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: PatchUsedStockDto,
  ) {
    return this.usedStock.patch(request.user, id, body);
  }

  @Post("admin/:id/activate")
  @Header("Cache-Control", NO_STORE)
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard, CurrentUsedStockUserGuard)
  @Roles(UserRole.ADMIN, UserRole.SALES)
  activate(
    @Request() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: ActivateUsedStockDto,
  ) {
    return this.usedStock.activate(request.user, id, body);
  }

  @Post("admin/:id/deactivate")
  @Header("Cache-Control", NO_STORE)
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard, CurrentUsedStockUserGuard)
  @Roles(UserRole.ADMIN, UserRole.SALES)
  deactivate(
    @Request() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: TransitionUsedStockDto,
  ) {
    return this.usedStock.deactivate(request.user, id, body);
  }

  @Post("admin/:id/sold")
  @Header("Cache-Control", NO_STORE)
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard, CurrentUsedStockUserGuard)
  @Roles(UserRole.ADMIN, UserRole.SALES)
  sold(
    @Request() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: TransitionUsedStockDto,
  ) {
    return this.usedStock.sold(request.user, id, body);
  }
}
