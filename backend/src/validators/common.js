import { z } from 'zod';

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
export const produtoIdParamSchema = z.object({ produtoId: z.coerce.number().int().positive() });

const nonNegativeNumber = z.preprocess(
  (value) => value === '' || value === null ? undefined : value,
  z.coerce.number().finite().nonnegative(),
);

const nonNegativeInteger = z.preprocess(
  (value) => value === '' || value === null ? undefined : value,
  z.coerce.number().int().nonnegative(),
);

export const produtoCreateSchema = z.object({
  nome: z.string().trim().min(1).max(160),
  principioAtivo: z.string().trim().min(1).max(160),
  categoria: z.string().trim().min(1).max(100),
  tipo: z.enum(['GENERICO', 'SIMILAR', 'MARCA']),
  precoUnitario: nonNegativeNumber,
}).strict();

export const produtoUpdateSchema = produtoCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'Informe ao menos um campo para atualização.',
);

export const estoqueCreateSchema = z.object({
  produtoId: z.coerce.number().int().positive(),
  quantidadeAtual: nonNegativeInteger,
  quantidadeMinima: nonNegativeInteger,
}).strict();

export const estoqueUpdateSchema = z.object({
  quantidadeAtual: nonNegativeInteger.optional(),
  quantidadeMinima: nonNegativeInteger.optional(),
}).strict().refine(
  (value) => Object.keys(value).length > 0,
  'Informe ao menos um campo para atualização.',
);

const optionalCnpj = z.preprocess(
  (value) => value === '' || value === null ? null : value,
  z.string().trim().transform((value) => value.replace(/\D/g, '')).refine(
    (value) => value.length === 14,
    'CNPJ deve conter 14 dígitos quando informado.',
  ).nullable().optional(),
);

const optionalEmail = z.preprocess(
  (value) => value === '' || value === null ? null : value,
  z.string().trim().email('E-mail inválido.').nullable().optional(),
);

export const fornecedorCreateSchema = z.object({
  nome: z.string().trim().min(1).max(160),
  cnpj: optionalCnpj,
  telefone: z.string().trim().min(1).max(40).nullable().optional(),
  email: optionalEmail,
}).strict();

export const fornecedorUpdateSchema = fornecedorCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'Informe ao menos um campo para atualização.',
);

export function validate(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const error = new Error('Dados inválidos.');
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    error.details = result.error.issues.map(({ path, message }) => ({ path, message }));
    throw error;
  }
  return result.data;
}

