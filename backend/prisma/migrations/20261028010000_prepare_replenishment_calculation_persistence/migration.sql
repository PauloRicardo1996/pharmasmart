-- CreateEnum
CREATE TYPE "RiscoReposicao" AS ENUM ('CRITICO', 'ALTO', 'MEDIO', 'BAIXO', 'SEM_DEMANDA', 'DADO_ANOMALO');

-- CreateEnum
CREATE TYPE "ConfiancaReposicao" AS ENUM ('BAIXA', 'MEDIA', 'ALTA');

-- AlterTable
ALTER TABLE "calculo_reposicao"
  ADD COLUMN "ano_referencia" INTEGER NOT NULL,
  ADD COLUMN "cobertura_desejada_dias" DECIMAL(10,2) NOT NULL,
  ADD COLUMN "cobertura_dias" DECIMAL(20,6),
  ADD COLUMN "confianca" "ConfiancaReposicao" NOT NULL,
  ADD COLUMN "demanda_media_diaria" DECIMAL(20,10) NOT NULL,
  ADD COLUMN "estoque_alvo" DECIMAL(20,6) NOT NULL,
  ADD COLUMN "estoque_atual" DECIMAL(20,3) NOT NULL,
  ADD COLUMN "estoque_seguranca" DECIMAL(20,6) NOT NULL,
  ADD COLUMN "historico_insuficiente" BOOLEAN NOT NULL,
  ADD COLUMN "id_relatorio" INTEGER NOT NULL,
  ADD COLUMN "margem_seguranca" DECIMAL(10,2) NOT NULL,
  ADD COLUMN "mes_referencia" INTEGER NOT NULL,
  ADD COLUMN "meses_historico" INTEGER NOT NULL,
  ADD COLUMN "quantidade_calculada" DECIMAL(20,6) NOT NULL,
  ADD COLUMN "risco" "RiscoReposicao" NOT NULL,
  ADD COLUMN "warnings" JSONB,
  ALTER COLUMN "demanda_media" SET DATA TYPE DECIMAL(20,6);

-- CreateIndex
CREATE INDEX "calculo_reposicao_ano_referencia_mes_referencia_idx" ON "calculo_reposicao"("ano_referencia", "mes_referencia");
CREATE INDEX "calculo_reposicao_risco_idx" ON "calculo_reposicao"("risco");
CREATE UNIQUE INDEX "calculo_reposicao_id_relatorio_id_produto_key" ON "calculo_reposicao"("id_relatorio", "id_produto");
CREATE UNIQUE INDEX "relatorio_reposicao_periodo_referencia_key" ON "relatorio_reposicao"("periodo_referencia");

-- AddForeignKey
ALTER TABLE "calculo_reposicao" ADD CONSTRAINT "calculo_reposicao_id_relatorio_fkey" FOREIGN KEY ("id_relatorio") REFERENCES "relatorio_reposicao"("id_relatorio") ON DELETE RESTRICT ON UPDATE CASCADE;
