-- CreateEnum
CREATE TYPE "AcaoAuditoria" AS ENUM ('LOGIN', 'LOGOUT', 'CRIAR', 'ALTERAR', 'DESATIVAR', 'IMPORTAR', 'GERAR', 'ALTERAR_STATUS');

-- CreateEnum
CREATE TYPE "RecursoAuditoria" AS ENUM ('AUTENTICACAO', 'USUARIO', 'PRODUTO', 'ESTOQUE', 'FORNECEDOR', 'IMPORTACAO', 'CONFIGURACAO_REPOSICAO', 'PEDIDO_COMPRA', 'REPOSICAO');

-- CreateTable
CREATE TABLE "auditoria" (
    "id_auditoria" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "acao" "AcaoAuditoria" NOT NULL,
    "recurso" "RecursoAuditoria" NOT NULL,
    "id_recurso" INTEGER,
    "descricao" TEXT NOT NULL,
    "dados" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id_auditoria")
);

-- CreateIndex
CREATE INDEX "auditoria_id_usuario_idx" ON "auditoria"("id_usuario");

-- CreateIndex
CREATE INDEX "auditoria_criado_em_idx" ON "auditoria"("criado_em");

-- CreateIndex
CREATE INDEX "auditoria_recurso_idx" ON "auditoria"("recurso");

-- CreateIndex
CREATE INDEX "auditoria_acao_idx" ON "auditoria"("acao");

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
