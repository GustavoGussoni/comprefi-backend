-- CreateTable
CREATE TABLE "valores_troca" (
    "id" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "capacidade" TEXT NOT NULL,
    "valor_base" DOUBLE PRECISION NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "valores_troca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionario_troca" (
    "id" TEXT NOT NULL,
    "modelo_atual" TEXT NOT NULL,
    "capacidade_atual" TEXT NOT NULL,
    "cor_atual" TEXT NOT NULL,
    "bateria_atual" INTEGER NOT NULL,
    "defeitos" JSONB,
    "pecas_trocadas" BOOLEAN NOT NULL DEFAULT false,
    "quais_pecas" TEXT,
    "modelo_desejado" TEXT NOT NULL,
    "onde_ouviu" TEXT,
    "tempo_pensando" TEXT,
    "urgencia_troca" TEXT,
    "valor_aparelho" DOUBLE PRECISION,
    "valor_final" DOUBLE PRECISION,
    "tem_defeito" BOOLEAN NOT NULL DEFAULT false,
    "precisa_cotacao" BOOLEAN NOT NULL DEFAULT false,
    "nome" TEXT,
    "email" TEXT,
    "whatsapp" TEXT,
    "etapa_atual" INTEGER NOT NULL DEFAULT 1,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questionario_troca_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "valores_troca_modelo_capacidade_key" ON "valores_troca"("modelo", "capacidade");
