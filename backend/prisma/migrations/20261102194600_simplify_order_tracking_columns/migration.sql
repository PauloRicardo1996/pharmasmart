-- Make supplier, price and total optional for external purchase tracking.
ALTER TABLE "pedido_compra" ALTER COLUMN "id_fornecedor" DROP NOT NULL;
ALTER TABLE "pedido_compra" ALTER COLUMN "valor_total" DROP NOT NULL;
ALTER TABLE "pedido_compra" ALTER COLUMN "status" SET DEFAULT 'PENDENTE';
ALTER TABLE "item_pedido_compra" ALTER COLUMN "preco_unitario" DROP NOT NULL;
ALTER TABLE "item_pedido_compra" ALTER COLUMN "subtotal" DROP NOT NULL;