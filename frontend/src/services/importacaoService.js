import { request } from './api.js';

export function validarPeriodo({ month, year, estoque, entradas, vendas }) {
  const formData = new FormData();
  formData.append('month', String(month));
  formData.append('year', String(year));
  formData.append('estoque', estoque);
  formData.append('entradas', entradas);
  formData.append('vendas', vendas);
  return request('/importacoes/validar-periodo', { method: 'POST', body: formData });
}

export function confirmarImportacao({ month, year, estoque, entradas, vendas }) {
  const formData = new FormData();
  formData.append('month', String(month));
  formData.append('year', String(year));
  formData.append('estoque', estoque);
  formData.append('entradas', entradas);
  formData.append('vendas', vendas);
  return request('/importacoes/confirmar', { method: 'POST', body: formData });
}
