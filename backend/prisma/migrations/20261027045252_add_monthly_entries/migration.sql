-- CreateTable
CREATE TABLE "entrada_mensal" (
    "id_entrada_mensal" SERIAL NOT NULL,
    "id_produto" INTEGER NOT NULL,
    "mes_referencia" INTEGER NOT NULL,
    "ano_referencia" INTEGER NOT NULL,
    "quantidade_entrada" INTEGER NOT NULL,
    "valor_entrada" DECIMAL(12,2) NOT NULL,
    "data_importacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entrada_mensal_pkey" PRIMARY KEY ("id_entrada_mensal")
);

-- CreateIndex
CREATE INDEX "entrada_mensal_ano_referencia_mes_referencia_idx" ON "entrada_mensal"("ano_referencia", "mes_referencia");

-- CreateIndex
CREATE UNIQUE INDEX "entrada_mensal_id_produto_mes_referencia_ano_referencia_key" ON "entrada_mensal"("id_produto", "mes_referencia", "ano_referencia");

-- AddForeignKey
ALTER TABLE "entrada_mensal" ADD CONSTRAINT "entrada_mensal_id_produto_fkey" FOREIGN KEY ("id_produto") REFERENCES "produto"("id_produto") ON DELETE RESTRICT ON UPDATE CASCADE;
