-- Additive only: no catalog backfill or changes to prices, activity or stock.
ALTER TABLE "product_variants"
  ADD COLUMN "crmSku" TEXT,
  ADD COLUMN "crmProductId" TEXT,
  ADD COLUMN "crmSkuRevision" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "product_variants_crmSku_key" ON "product_variants"("crmSku");
