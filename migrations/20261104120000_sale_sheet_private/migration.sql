-- CreateTable
CREATE TABLE "sale_sheets" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "creationKeyHash" TEXT,
    "creationBodyHash" TEXT,
    "tokenHash" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "pdfStatus" TEXT NOT NULL,
    "crmStatus" TEXT NOT NULL,
    "linkExpiresAt" TIMESTAMP(3) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_sheet_documents" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "bytes" BYTEA NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_sheet_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_sheet_events" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_sheet_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sale_sheets_tokenHash_key" ON "sale_sheets"("tokenHash");

-- CreateIndex
CREATE INDEX "sale_sheets_ownerId_createdAt_idx" ON "sale_sheets"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "sale_sheets_pdfStatus_crmStatus_idx" ON "sale_sheets"("pdfStatus", "crmStatus");

-- CreateIndex
CREATE UNIQUE INDEX "sale_sheets_ownerId_creationKeyHash_key" ON "sale_sheets"("ownerId", "creationKeyHash");

-- CreateIndex
CREATE UNIQUE INDEX "sale_sheet_documents_sheetId_revision_key" ON "sale_sheet_documents"("sheetId", "revision");

-- CreateIndex
CREATE INDEX "sale_sheet_events_sheetId_at_idx" ON "sale_sheet_events"("sheetId", "at");

-- AddForeignKey
ALTER TABLE "sale_sheet_documents" ADD CONSTRAINT "sale_sheet_documents_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "sale_sheets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_sheet_events" ADD CONSTRAINT "sale_sheet_events_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "sale_sheets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Bounded V1 private PDF bytes, enforced independently of application checks.
ALTER TABLE "sale_sheet_documents" ADD CONSTRAINT "sale_sheet_documents_bytes_limit"
  CHECK (octet_length("bytes") BETWEEN 1 AND 2097152);

-- A completed version is write-once even if application code regresses.
CREATE FUNCTION "sale_sheet_document_immutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'sale sheet document versions are immutable';
END;
$$;
CREATE TRIGGER "sale_sheet_document_immutable_trigger"
  BEFORE UPDATE OR DELETE ON "sale_sheet_documents"
  FOR EACH ROW EXECUTE FUNCTION "sale_sheet_document_immutable"();

-- The existing real user is the owner, without adding columns to users.
ALTER TABLE "sale_sheets" ADD CONSTRAINT "sale_sheets_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
