import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersRepository } from './repositories/users.repository';
import { UsersPrismaRepository } from './repositories/prisma/users-prisma.repository';
import { PrismaService } from '../../database/prisma.service';
import { AdminIdentityGuard } from '../auth/admin-identity.guard';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    PrismaService,
    AdminIdentityGuard,
    {
      provide: UsersRepository,
      useClass: UsersPrismaRepository,
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
