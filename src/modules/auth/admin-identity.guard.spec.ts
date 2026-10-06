import { ExecutionContext } from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { ConfigService } from "@nestjs/config";
import { CatalogController } from "../catalog/catalog.controller";
import { ProductController } from "../product/product.controller";
import { QuestionarioController } from "../trade/questionario.controller";
import { ValorTrocaController } from "../trade/valor-troca.controller";
import { UsersController } from "../users/users.controller";
import { AdminIdentityGuard } from "./admin-identity.guard";
import { AuthController } from "./auth.controller";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { LocalAuthGuard } from "./local-auth.guard";

describe("AdminIdentityGuard", () => {
  const contextFor = (email?: string) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user: { email } }) }),
    }) as unknown as ExecutionContext;

  const guardFor = (adminEmail?: string) =>
    new AdminIdentityGuard({
      get: () => adminEmail,
    } as unknown as ConfigService);

  it("aceita somente a identidade configurada, com comparação normalizada", () => {
    expect(
      guardFor("  Gustavo@Example.com  ").canActivate(
        contextFor("gustavo@example.com"),
      ),
    ).toBe(true);
    expect(
      guardFor("gustavo@example.com").canActivate(
        contextFor("iago@example.com"),
      ),
    ).toBe(false);
  });

  it("nega por padrão se faltar configuração ou identidade autenticada", () => {
    expect(guardFor().canActivate(contextFor("gustavo@example.com"))).toBe(
      false,
    );
    expect(guardFor("gustavo@example.com").canActivate(contextFor())).toBe(
      false,
    );
  });

  it("protege todas as escritas de valores e preserva a leitura pública", () => {
    for (const name of ["create", "bulkUpsert", "update", "remove"] as const) {
      expect(
        Reflect.getMetadata(
          GUARDS_METADATA,
          ValorTrocaController.prototype[name],
        ),
      ).toEqual([JwtAuthGuard, AdminIdentityGuard]);
    }
    for (const name of ["findAll", "getStats", "findOne"] as const) {
      expect(
        Reflect.getMetadata(
          GUARDS_METADATA,
          ValorTrocaController.prototype[name],
        ),
      ).toBeUndefined();
    }
  });

  it("protege usuários e registro sem alterar o login", () => {
    for (const name of [
      "create",
      "findAll",
      "findOne",
      "update",
      "remove",
    ] as const) {
      expect(
        Reflect.getMetadata(GUARDS_METADATA, UsersController.prototype[name]),
      ).toEqual([JwtAuthGuard, AdminIdentityGuard]);
    }
    expect(
      Reflect.getMetadata(GUARDS_METADATA, AuthController.prototype.register),
    ).toEqual([JwtAuthGuard, AdminIdentityGuard]);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, AuthController.prototype.login),
    ).toEqual([LocalAuthGuard]);
  });

  it("impede SALES de escrever nos dois catálogos e nas simulações", () => {
    for (const name of [
      "create",
      "update",
      "remove",
      "bulkCreate",
      "syncFromSheet",
    ] as const) {
      expect(
        Reflect.getMetadata(GUARDS_METADATA, ProductController.prototype[name]),
      ).toEqual([JwtAuthGuard, AdminIdentityGuard]);
    }
    for (const name of [
      "updateVariants",
      "updateProduct",
      "createProduct",
      "deactivateProduct",
    ] as const) {
      expect(
        Reflect.getMetadata(GUARDS_METADATA, CatalogController.prototype[name]),
      ).toEqual([JwtAuthGuard, AdminIdentityGuard]);
    }
    for (const name of ["update", "remove"] as const) {
      expect(
        Reflect.getMetadata(
          GUARDS_METADATA,
          QuestionarioController.prototype[name],
        ),
      ).toEqual([JwtAuthGuard, AdminIdentityGuard]);
    }
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        ProductController.prototype.calculatePrices,
      ),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        QuestionarioController.prototype.findAll,
      ),
    ).toEqual([JwtAuthGuard]);
  });
});
