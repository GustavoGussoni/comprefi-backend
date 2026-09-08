CREATE TYPE "CrmDeliveryStatus" AS ENUM ('NOT_SENT', 'PENDING', 'SENT', 'FAILED');

ALTER TABLE "questionario_troca"
ADD COLUMN "cep" TEXT,
ADD COLUMN "mensagem_follow_up" TEXT,
ADD COLUMN "crm_status" "CrmDeliveryStatus" NOT NULL DEFAULT 'NOT_SENT',
ADD COLUMN "crm_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "crm_last_attempt_at" TIMESTAMP(3),
ADD COLUMN "crm_sent_at" TIMESTAMP(3),
ADD COLUMN "crm_last_error" TEXT,
ADD COLUMN "crm_external_id" TEXT,
ADD COLUMN "crm_external_url" TEXT;

CREATE INDEX "questionario_troca_crm_status_idx"
ON "questionario_troca"("crm_status");

CREATE INDEX "questionario_troca_created_at_idx"
ON "questionario_troca"("created_at");
