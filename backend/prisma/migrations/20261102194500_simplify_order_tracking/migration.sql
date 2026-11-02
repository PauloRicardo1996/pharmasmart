-- Add operational tracking statuses while preserving legacy values.
ALTER TYPE "StatusPedido" ADD VALUE IF NOT EXISTS 'PENDENTE';
ALTER TYPE "StatusPedido" ADD VALUE IF NOT EXISTS 'PEDIDO';
ALTER TYPE "StatusPedido" ADD VALUE IF NOT EXISTS 'RECEBIDO';
-- CANCELADO already exists in the legacy enum and remains available.