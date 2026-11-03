-- Vínculo aditivo e opcional: unidades históricas permanecem sem vínculo até
-- revisão manual do plano de consolidação. Não há backfill nesta migration.
ALTER TABLE "used_stock_units" ADD COLUMN "catalogVariantId" TEXT;

CREATE INDEX "used_stock_units_catalogVariantId_idx"
ON "used_stock_units"("catalogVariantId");

ALTER TABLE "used_stock_units"
ADD CONSTRAINT "used_stock_units_catalogVariantId_fkey"
FOREIGN KEY ("catalogVariantId") REFERENCES "product_variants"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
