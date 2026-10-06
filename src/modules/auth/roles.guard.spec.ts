import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@prisma/client";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RolesGuard } from "./roles.guard";
import { AuthController } from "./auth.controller";
import { UsersController } from "../users/users.controller";
import { CatalogController } from "../catalog/catalog.controller";
import { ProductController } from "../product/product.controller";
import { ValorTrocaController } from "../trade/valor-troca.controller";
import { QuestionarioController } from "../trade/questionario.controller";

// Os decorators são testados diretamente: nenhuma chamada a banco, CRM ou HTTP.
type ControllerType = { prototype: object };

function authorization(
  controller: ControllerType,
  method: string,
  role: UserRole,
) {
  const handler = Reflect.get(controller.prototype, method) as (
    ...args: unknown[]
  ) => unknown;
  const context = {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  } as unknown as ExecutionContext;
  const guards =
    Reflect.getMetadata("__guards__", handler) ??
    Reflect.getMetadata("__guards__", controller) ??
    [];
  const roles = new RolesGuard(new Reflector());
  return { allowed: roles.canActivate(context), guards };
}

describe("Permissões preservadas na promoção do admin v2", () => {
  const mutations: Array<[ControllerType, string]> = [
    [AuthController, "register"],
    [UsersController, "create"],
    [UsersController, "update"],
    [UsersController, "remove"],
    [CatalogController, "updateVariants"],
    [ProductController, "create"],
    [ValorTrocaController, "create"],
    [QuestionarioController, "remove"],
  ];

  it.each(mutations)("%p.%s: só ADMIN pode modificar", (controller, method) => {
    expect(authorization(controller, method, UserRole.ADMIN).allowed).toBe(
      true,
    );
    expect(authorization(controller, method, UserRole.SALES).allowed).toBe(
      false,
    );
  });

  it("SALES consulta simulações, mas não copia payload nem gerencia usuários", () => {
    expect(
      authorization(QuestionarioController, "findAll", UserRole.SALES).allowed,
    ).toBe(true);
    expect(
      authorization(QuestionarioController, "getPayload", UserRole.SALES)
        .allowed,
    ).toBe(false);
    expect(
      authorization(UsersController, "findAll", UserRole.SALES).allowed,
    ).toBe(false);
    expect(
      authorization(UsersController, "findOne", UserRole.SALES).allowed,
    ).toBe(false);
  });

  it("usa JWT e RolesGuard nas rotas sensíveis, não só esconde botões", () => {
    for (const [controller, method] of mutations) {
      const { guards } = authorization(controller, method, UserRole.SALES);
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RolesGuard);
    }
  });
});
