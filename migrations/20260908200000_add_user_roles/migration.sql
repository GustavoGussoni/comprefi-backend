CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SALES');

ALTER TABLE "users"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'SALES';

-- Usuários existentes já operavam como administradores antes da introdução de papéis.
-- Mantê-los como ADMIN evita bloqueio acidental durante a migração.
UPDATE "users" SET "role" = 'ADMIN';
