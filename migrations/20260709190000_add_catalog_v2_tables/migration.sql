-- CreateTable
CREATE TABLE "product_groups" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "section" TEXT,
    "specs" TEXT,
    "details" TEXT,
    "battery" TEXT,
    "storages" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "storage" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "originalPrice" TEXT NOT NULL,
    "installmentPrice" TEXT NOT NULL,
    "pixPrice" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "productGroupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_groups_slug_key" ON "product_groups"("slug");

-- CreateIndex
CREATE INDEX "product_groups_category_idx" ON "product_groups"("category");

-- CreateIndex
CREATE INDEX "product_groups_category_section_idx" ON "product_groups"("category", "section");

-- CreateIndex
CREATE INDEX "product_variants_productGroupId_idx" ON "product_variants"("productGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_productGroupId_storage_color_key" ON "product_variants"("productGroupId", "storage", "color");

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productGroupId_fkey" FOREIGN KEY ("productGroupId") REFERENCES "product_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
