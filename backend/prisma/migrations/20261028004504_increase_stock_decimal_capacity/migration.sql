-- AlterTable
ALTER TABLE "estoque" ALTER COLUMN "quantidade_atual" SET DATA TYPE DECIMAL(20,3);

-- AlterTable
ALTER TABLE "estoque_snapshot" ALTER COLUMN "quantidade" SET DATA TYPE DECIMAL(20,3);
