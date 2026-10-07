import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ValorTrocaController } from './valor-troca.controller';
import { TradeValueWriterGuard } from './trade-value-writer.guard';

function routeAccess(method: string, role: UserRole, email: string) {
  const handler = Reflect.get(ValorTrocaController.prototype, method) as (
    ...args: unknown[]
  ) => unknown;
  const context = {
    getHandler: () => handler,
    getClass: () => ValorTrocaController,
    switchToHttp: () => ({
      getRequest: () => ({ user: { id: 'test-id', role, email } }),
    }),
  } as unknown as ExecutionContext;
  const guards = Reflect.getMetadata('__guards__', handler) as Array<
    new () => unknown
  >;
  const roleAllowed = new RolesGuard(new Reflector()).canActivate(context);
  const writerAllowed = guards.includes(TradeValueWriterGuard)
    ? new TradeValueWriterGuard().canActivate(context)
    : true;
  return { allowed: roleAllowed && writerAllowed, guards };
}

describe('Permissão pontual de escrita em Valores de troca', () => {
  it.each(['create', 'update'])(
    '%s aceita Iago SALES e ADMIN; bloqueia outros SALES',
    (method) => {
      expect(routeAccess(method, UserRole.ADMIN, 'gustavo@example.com').allowed).toBe(true);
      expect(routeAccess(method, UserRole.SALES, 'iago@comprefi.com').allowed).toBe(true);
      expect(routeAccess(method, UserRole.SALES, 'IAGO@COMPREFI.COM ').allowed).toBe(true);
      expect(routeAccess(method, UserRole.SALES, 'outro@comprefi.com').allowed).toBe(false);
      expect(routeAccess(method, UserRole.SALES, '').allowed).toBe(false);
      const { guards } = routeAccess(method, UserRole.SALES, 'iago@comprefi.com');
      expect(guards).toEqual([JwtAuthGuard, RolesGuard, TradeValueWriterGuard]);
    },
  );

  it.each(['remove', 'bulkUpsert'])(
    '%s continua reservado a ADMIN, inclusive para Iago',
    (method) => {
      expect(routeAccess(method, UserRole.ADMIN, 'admin@example.com').allowed).toBe(true);
      expect(routeAccess(method, UserRole.SALES, 'iago@comprefi.com').allowed).toBe(false);
    },
  );
});
