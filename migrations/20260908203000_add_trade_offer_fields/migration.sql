ALTER TABLE "questionario_troca"
ADD COLUMN "produto_desejado_nome" TEXT,
ADD COLUMN "valor_base" DOUBLE PRECISION,
ADD COLUMN "depreciacao_bateria" DOUBLE PRECISION,
ADD COLUMN "depreciacao_defeitos" DOUBLE PRECISION,
ADD COLUMN "preco_produto" DOUBLE PRECISION,
ADD COLUMN "valor_com_desconto" DOUBLE PRECISION,
ADD COLUMN "desconto_percentual" DOUBLE PRECISION DEFAULT 3,
ADD COLUMN "valor_manual_usado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "cupom_desconto" TEXT,
ADD COLUMN "offer_expires_at" TIMESTAMP(3);
