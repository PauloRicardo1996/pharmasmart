-- CreateEnum
CREATE TYPE "TipoMedicamento" AS ENUM ('GENERICO', 'SIMILAR', 'MARCA');

-- CreateEnum
CREATE TYPE "StatusSugestao" AS ENUM ('PENDENTE', 'APROVADA', 'REJEITADA');

-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('ABERTO', 'ENVIADO', 'CONFIRMADO', 'ENTREGUE', 'CANCELADO');

-- CreateTable
CREATE TABLE "produto" (
    "id_produto" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "principio_ativo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "tipo" "TipoMedicamento" NOT NULL,
    "preco_unitario" DECIMAL(10,2) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "produto_pkey" PRIMARY KEY ("id_produto")
);

-- CreateTable
CREATE TABLE "estoque" (
    "id_estoque" SERIAL NOT NULL,
    "id_produto" INTEGER NOT NULL,
    "quantidade_atual" INTEGER NOT NULL,
    "quantidade_minima" INTEGER NOT NULL,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estoque_pkey" PRIMARY KEY ("id_estoque")
);

-- CreateTable
CREATE TABLE "historico_venda" (
    "id_historico" SERIAL NOT NULL,
    "id_produto" INTEGER NOT NULL,
    "mes_referencia" INTEGER NOT NULL,
    "ano_referencia" INTEGER NOT NULL,
    "quantidade_vendida" INTEGER NOT NULL,

    CONSTRAINT "historico_venda_pkey" PRIMARY KEY ("id_historico")
);

-- CreateTable
CREATE TABLE "fornecedor" (
    "id_fornecedor" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "telefone" TEXT,
    "email" TEXT,

    CONSTRAINT "fornecedor_pkey" PRIMARY KEY ("id_fornecedor")
);

-- CreateTable
CREATE TABLE "parametro_reposicao" (
    "id_parametro" SERIAL NOT NULL,
    "margem_seguranca" DECIMAL(5,2) NOT NULL,
    "periodo_analise_meses" INTEGER NOT NULL,
    "estoque_minimo_padrao" INTEGER NOT NULL,

    CONSTRAINT "parametro_reposicao_pkey" PRIMARY KEY ("id_parametro")
);

-- CreateTable
CREATE TABLE "calculo_reposicao" (
    "id_calculo" SERIAL NOT NULL,
    "id_parametro" INTEGER NOT NULL,
    "id_produto" INTEGER NOT NULL,
    "data_calculo" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "demanda_media" DECIMAL(10,2) NOT NULL,
    "quantidade_recomendada" INTEGER NOT NULL,
    "risco_falta" BOOLEAN NOT NULL,

    CONSTRAINT "calculo_reposicao_pkey" PRIMARY KEY ("id_calculo")
);

-- CreateTable
CREATE TABLE "sugestao_compra" (
    "id_sugestao" SERIAL NOT NULL,
    "id_calculo" INTEGER NOT NULL,
    "id_produto" INTEGER NOT NULL,
    "data_sugestao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantidade_sugerida" INTEGER NOT NULL,
    "status" "StatusSugestao" NOT NULL DEFAULT 'PENDENTE',

    CONSTRAINT "sugestao_compra_pkey" PRIMARY KEY ("id_sugestao")
);

-- CreateTable
CREATE TABLE "pedido_compra" (
    "id_pedido" SERIAL NOT NULL,
    "id_fornecedor" INTEGER NOT NULL,
    "data_pedido" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "StatusPedido" NOT NULL DEFAULT 'ABERTO',
    "valor_total" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "pedido_compra_pkey" PRIMARY KEY ("id_pedido")
);

-- CreateTable
CREATE TABLE "item_pedido_compra" (
    "id_item_pedido" SERIAL NOT NULL,
    "id_pedido" INTEGER NOT NULL,
    "id_produto" INTEGER NOT NULL,
    "id_sugestao" INTEGER,
    "quantidade" INTEGER NOT NULL,
    "preco_unitario" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "item_pedido_compra_pkey" PRIMARY KEY ("id_item_pedido")
);

-- CreateTable
CREATE TABLE "relatorio_reposicao" (
    "id_relatorio" SERIAL NOT NULL,
    "data_geracao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodo_referencia" TEXT NOT NULL,

    CONSTRAINT "relatorio_reposicao_pkey" PRIMARY KEY ("id_relatorio")
);

-- CreateTable
CREATE TABLE "relatorio_sugestao" (
    "id_relatorio" INTEGER NOT NULL,
    "id_sugestao" INTEGER NOT NULL,

    CONSTRAINT "relatorio_sugestao_pkey" PRIMARY KEY ("id_relatorio","id_sugestao")
);

-- CreateIndex
CREATE UNIQUE INDEX "estoque_id_produto_key" ON "estoque"("id_produto");

-- CreateIndex
CREATE UNIQUE INDEX "historico_venda_id_produto_mes_referencia_ano_referencia_key" ON "historico_venda"("id_produto", "mes_referencia", "ano_referencia");

-- CreateIndex
CREATE UNIQUE INDEX "fornecedor_cnpj_key" ON "fornecedor"("cnpj");

-- AddForeignKey
ALTER TABLE "estoque" ADD CONSTRAINT "estoque_id_produto_fkey" FOREIGN KEY ("id_produto") REFERENCES "produto"("id_produto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_venda" ADD CONSTRAINT "historico_venda_id_produto_fkey" FOREIGN KEY ("id_produto") REFERENCES "produto"("id_produto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculo_reposicao" ADD CONSTRAINT "calculo_reposicao_id_parametro_fkey" FOREIGN KEY ("id_parametro") REFERENCES "parametro_reposicao"("id_parametro") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculo_reposicao" ADD CONSTRAINT "calculo_reposicao_id_produto_fkey" FOREIGN KEY ("id_produto") REFERENCES "produto"("id_produto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sugestao_compra" ADD CONSTRAINT "sugestao_compra_id_calculo_fkey" FOREIGN KEY ("id_calculo") REFERENCES "calculo_reposicao"("id_calculo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sugestao_compra" ADD CONSTRAINT "sugestao_compra_id_produto_fkey" FOREIGN KEY ("id_produto") REFERENCES "produto"("id_produto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_compra" ADD CONSTRAINT "pedido_compra_id_fornecedor_fkey" FOREIGN KEY ("id_fornecedor") REFERENCES "fornecedor"("id_fornecedor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_pedido_compra" ADD CONSTRAINT "item_pedido_compra_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "pedido_compra"("id_pedido") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_pedido_compra" ADD CONSTRAINT "item_pedido_compra_id_produto_fkey" FOREIGN KEY ("id_produto") REFERENCES "produto"("id_produto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_pedido_compra" ADD CONSTRAINT "item_pedido_compra_id_sugestao_fkey" FOREIGN KEY ("id_sugestao") REFERENCES "sugestao_compra"("id_sugestao") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorio_sugestao" ADD CONSTRAINT "relatorio_sugestao_id_relatorio_fkey" FOREIGN KEY ("id_relatorio") REFERENCES "relatorio_reposicao"("id_relatorio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorio_sugestao" ADD CONSTRAINT "relatorio_sugestao_id_sugestao_fkey" FOREIGN KEY ("id_sugestao") REFERENCES "sugestao_compra"("id_sugestao") ON DELETE RESTRICT ON UPDATE CASCADE;
