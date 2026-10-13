import * as repository from '../repositories/fornecedorRepository.js';
import { conflict, notFound } from '../utils/apiError.js';

function ensureFornecedor(fornecedor) {
  if (!fornecedor) throw notFound('SUPPLIER_NOT_FOUND', 'Fornecedor não encontrado.');
  return fornecedor;
}

export async function listFornecedores(query) {
  const [data, total] = await repository.listFornecedores(query);
  return { data, total };
}

export async function getFornecedor(id) { return ensureFornecedor(await repository.findFornecedorById(id)); }
export async function createFornecedor(data) { return repository.createFornecedor(data); }
export async function updateFornecedor(id, data) {
  ensureFornecedor(await repository.findFornecedorById(id));
  return repository.updateFornecedor(id, data);
}

export async function deleteFornecedor(id) {
  ensureFornecedor(await repository.findFornecedorById(id));
  if (await repository.countFornecedorRelations(id) > 0) {
    throw conflict('SUPPLIER_HAS_RELATIONS', 'Fornecedor possui pedidos relacionados e não pode ser excluído.');
  }
  await repository.deleteFornecedor(id);
}

