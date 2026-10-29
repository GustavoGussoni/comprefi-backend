-- CreateEnum
CREATE TYPE "UsedStockStatus" AS ENUM ('draft', 'available', 'sold');

-- CreateTable
CREATE TABLE "used_stock_units" (
    "id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "creationKey" TEXT NOT NULL,
    "creationFingerprint" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "storage" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "battery" INTEGER,
    "details" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL DEFAULT '',
    "imageIsIllustrative" BOOLEAN NOT NULL DEFAULT true,
    "realImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pixPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "installments" INTEGER NOT NULL DEFAULT 12,
    "installmentPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "imei" TEXT,
    "internalNotes" TEXT NOT NULL DEFAULT '',
    "status" "UsedStockStatus" NOT NULL DEFAULT 'draft',
    "receivedAt" TIMESTAMP(3),
    "checkedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "soldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "used_stock_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "used_stock_history" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "used_stock_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "used_stock_units_imei_key" ON "used_stock_units"("imei");

-- CreateIndex
CREATE INDEX "used_stock_units_status_createdAt_idx" ON "used_stock_units"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "used_stock_units_createdById_creationKey_key" ON "used_stock_units"("createdById", "creationKey");

-- CreateIndex
CREATE INDEX "used_stock_history_unitId_at_idx" ON "used_stock_history"("unitId", "at");

-- AddForeignKey
ALTER TABLE "used_stock_units" ADD CONSTRAINT "used_stock_units_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "used_stock_history" ADD CONSTRAINT "used_stock_history_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "used_stock_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "used_stock_history" ADD CONSTRAINT "used_stock_history_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Regras limitadas ao estoque novo; não alteram nenhuma tabela já existente.
ALTER TABLE "used_stock_units" ADD CONSTRAINT "used_stock_revision_positive" CHECK ("revision" >= 1);
ALTER TABLE "used_stock_units" ADD CONSTRAINT "used_stock_battery_range" CHECK ("battery" IS NULL OR "battery" BETWEEN 1 AND 100);
ALTER TABLE "used_stock_units" ADD CONSTRAINT "used_stock_prices_nonnegative" CHECK ("pixPrice" >= 0 AND "installmentPrice" >= 0);
ALTER TABLE "used_stock_units" ADD CONSTRAINT "used_stock_installments_range" CHECK ("installments" BETWEEN 1 AND 24);
ALTER TABLE "used_stock_units" ADD CONSTRAINT "used_stock_imei_format" CHECK ("imei" IS NULL OR "imei" ~ '^[0-9]{15}$');
ALTER TABLE "used_stock_units" ADD CONSTRAINT "used_stock_identity_required" CHECK (length(btrim("model")) > 0 AND length(btrim("storage")) > 0 AND length(btrim("color")) > 0);
ALTER TABLE "used_stock_units" ADD CONSTRAINT "used_stock_published_complete" CHECK (
  "status" = 'draft' OR (
    "battery" IS NOT NULL AND "pixPrice" > 0 AND "installmentPrice" > 0
    AND length(btrim("details")) > 0 AND length(btrim("image")) > 0
    AND "receivedAt" IS NOT NULL AND "checkedAt" IS NOT NULL AND "activatedAt" IS NOT NULL
  )
);
ALTER TABLE "used_stock_units" ADD CONSTRAINT "used_stock_sold_at_required" CHECK ("status" != 'sold' OR "soldAt" IS NOT NULL);
