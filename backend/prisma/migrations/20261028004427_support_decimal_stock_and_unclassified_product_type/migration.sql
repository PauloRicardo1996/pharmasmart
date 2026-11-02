/*
  Warnings:

  - You are about to alter the column `quantidade_atual` on the `estoque` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(12,3)`.
  - You are about to alter the column `quantidade` on the `estoque_snapshot` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(12,3)`.

*/
-- AlterEnum
ALTER TYPE "TipoMedicamento" ADD VALUE 'NAO_CLASSIFICADO';

-- AlterTable
ALTER TABLE "estoque" ALTER COLUMN "quantidade_atual" SET DATA TYPE DECIMAL(12,3);

-- AlterTable
ALTER TABLE "estoque_snapshot" ALTER COLUMN "quantidade" SET DATA TYPE DECIMAL(12,3);
