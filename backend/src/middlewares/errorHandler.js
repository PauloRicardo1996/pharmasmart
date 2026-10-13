import { Prisma } from '@prisma/client';

export function notFound(_req, res) {
  res.status(404).json({ error: { code: 'ROUTE_NOT_FOUND', message: 'Rota não encontrada.' } });
}

function prismaError(err) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(',') : String(err.meta?.target || 'campo');
      if (target.includes('cnpj')) return { status: 409, code: 'SUPPLIER_CNPJ_ALREADY_EXISTS', message: 'Já existe um fornecedor com este CNPJ.' };
      return { status: 409, code: 'UNIQUE_CONSTRAINT_CONFLICT', message: 'Já existe um registro com os dados informados.' };
    }
    if (err.code === 'P2003') return { status: 409, code: 'RELATED_RECORD_CONFLICT', message: 'O registro possui relacionamentos que impedem esta operação.' };
    if (err.code === 'P2025') return { status: 404, code: 'RESOURCE_NOT_FOUND', message: 'Registro não encontrado.' };
  }
  return null;
}

export function errorHandler(err, _req, res, _next) {
  const mapped = prismaError(err);
  const status = mapped?.status || err.status || (err instanceof SyntaxError ? 400 : 500);
  const code = mapped?.code || err.code || (status === 400 ? 'BAD_REQUEST' : 'INTERNAL_SERVER_ERROR');
  const message = mapped?.message || err.message || 'Erro interno do servidor.';
  const response = { error: { code, message } };
  if (err.details && status < 500) response.error.details = err.details;
  if (status >= 500) console.error(err);
  res.status(status).json(response);
}

