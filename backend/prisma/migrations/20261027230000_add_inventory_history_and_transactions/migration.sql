-- AlterTable
ALTER TABLE "fornecedor" ADD COLUMN     "codigo_externo" TEXT;

-- AlterTable
ALTER TABLE "produto" ADD COLUMN     "codigo_externo" TEXT NOT NULL,
ADD COLUMN     "grupo" TEXT,
ADD COLUMN     "sub_grupo" TEXT;

-- CreateTable
CREATE TABLE "produto_codigo_barra" (
    "id_produto_codigo_barra" SERIAL NOT NULL,
    "id_produto" INTEGER NOT NULL,
    "codigo_barra" TEXT NOT NULL,

    CONSTRAINT "produto_codigo_barra_pkey" PRIMARY KEY ("id_produto_codigo_barra")
);

-- CreateTable
CREATE TABLE "estoque_snapshot" (
    "id_estoque_snapshot" SERIAL NOT NULL,
    "id_produto" INTEGER NOT NULL,
    "data_referencia" TIMESTAMP(3) NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "data_importacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estoque_snapshot_pkey" PRIMARY KEY ("id_estoque_snapshot")
);

-- CreateTable
CREATE TABLE "venda" (
    "id_venda" SERIAL NOT NULL,
    "documento" TEXT,
    "data" TIMESTAMP(3) NOT NULL,
    "valor_documento" DECIMAL(12,2),
    "vendedor" TEXT,
    "caixa" TEXT,
    "data_importacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venda_pkey" PRIMARY KEY ("id_venda")
);

-- CreateTable
CREATE TABLE "item_venda" (
    "id_item_venda" SERIAL NOT NULL,
    "id_venda" INTEGER NOT NULL,
    "id_produto" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valor_liquido" DECIMAL(12,2) NOT NULL,
    "valor_bruto" DECIMAL(12,2),
    "desconto" DECIMAL(12,2),

    CONSTRAINT "item_venda_pkey" PRIMARY KEY ("id_item_venda")
);

-- CreateTable
CREATE TABLE "entrada_compra" (
    "id_entrada_compra" SERIAL NOT NULL,
    "documento" TEXT,
    "id_fornecedor" INTEGER,
    "data" TIMESTAMP(3) NOT NULL,
    "filial" TEXT,
    "total_nota" DECIMAL(12,2),
    "data_importacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entrada_compra_pkey" PRIMARY KEY ("id_entrada_compra")
);

-- CreateTable
CREATE TABLE "item_entrada_compra" (
    "id_item_entrada_compra" SERIAL NOT NULL,
    "id_entrada_compra" INTEGER NOT NULL,
    "id_produto" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valor_unitario" DECIMAL(12,2),
    "valor_total" DECIMAL(12,2),
    "desconto" DECIMAL(12,2),

    CONSTRAINT "item_entrada_compra_pkey" PRIMARY KEY ("id_item_entrada_compra")
);

-- CreateIndex
CREATE INDEX "produto_codigo_barra_codigo_barra_idx" ON "produto_codigo_barra"("codigo_barra");

-- CreateIndex
CREATE UNIQUE INDEX "produto_codigo_barra_id_produto_codigo_barra_key" ON "produto_codigo_barra"("id_produto", "codigo_barra");

-- CreateIndex
CREATE INDEX "estoque_snapshot_data_referencia_idx" ON "estoque_snapshot"("data_referencia");

-- CreateIndex
CREATE UNIQUE INDEX "estoque_snapshot_id_produto_data_referencia_key" ON "estoque_snapshot"("id_produto", "data_referencia");

-- CreateIndex
CREATE INDEX "venda_documento_idx" ON "venda"("documento");

-- CreateIndex
CREATE INDEX "venda_data_idx" ON "venda"("data");

-- CreateIndex
CREATE INDEX "item_venda_id_produto_idx" ON "item_venda"("id_produto");

-- CreateIndex
CREATE INDEX "entrada_compra_documento_idx" ON "entrada_compra"("documento");

-- CreateIndex
CREATE INDEX "entrada_compra_data_idx" ON "entrada_compra"("data");

-- CreateIndex
CREATE INDEX "item_entrada_compra_id_produto_idx" ON "item_entrada_compra"("id_produto");

-- CreateIndex
CREATE UNIQUE INDEX "fornecedor_codigo_externo_key" ON "fornecedor"("codigo_externo");

-- CreateIndex
CREATE UNIQUE INDEX "produto_codigo_externo_key" ON "produto"("codigo_externo");

-- AddForeignKey
ALTER TABLE "produto_codigo_barra" ADD CONSTRAINT "produto_codigo_barra_id_produto_fkey" FOREIGN KEY ("id_produto") REFERENCES "produto"("id_produto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estoque_snapshot" ADD CONSTRAINT "estoque_snapshot_id_produto_fkey" FOREIGN KEY ("id_produto") REFERENCES "produto"("id_produto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_venda" ADD CONSTRAINT "item_venda_id_venda_fkey" FOREIGN KEY ("id_venda") REFERENCES "venda"("id_venda") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_venda" ADD CONSTRAINT "item_venda_id_produto_fkey" FOREIGN KEY ("id_produto") REFERENCES "produto"("id_produto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrada_compra" ADD CONSTRAINT "entrada_compra_id_fornecedor_fkey" FOREIGN KEY ("id_fornecedor") REFERENCES "fornecedor"("id_fornecedor") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_entrada_compra" ADD CONSTRAINT "item_entrada_compra_id_entrada_compra_fkey" FOREIGN KEY ("id_entrada_compra") REFERENCES "entrada_compra"("id_entrada_compra") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_entrada_compra" ADD CONSTRAINT "item_entrada_compra_id_produto_fkey" FOREIGN KEY ("id_produto") REFERENCES "produto"("id_produto") ON DELETE RESTRICT ON UPDATE CASCADE;
