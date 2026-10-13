import React, { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import { createEstoque, updateEstoque } from '../services/estoqueService.js';

export default function StockFormModal({ open, stock, products, onClose, onSuccess, onError }) {
  const [form, setForm] = useState({ produtoId: '', quantidadeAtual: '', quantidadeMinima: '' }); const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(stock ? { produtoId: stock.produtoId || stock.produto?.id || '', quantidadeAtual: stock.quantidadeAtual, quantidadeMinima: stock.quantidadeMinima } : { produtoId: products[0]?.id || '', quantidadeAtual: '', quantidadeMinima: '' }); }, [stock, open, products]);
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const save = async () => { setSaving(true); try { const payload = { quantidadeAtual: Number(form.quantidadeAtual), quantidadeMinima: Number(form.quantidadeMinima) }; if (stock) await updateEstoque(stock.id, payload); else await createEstoque({ ...payload, produtoId: Number(form.produtoId) }); onSuccess(stock ? 'Estoque atualizado com sucesso.' : 'Estoque cadastrado com sucesso.'); onClose(); } catch (error) { onError(error); } finally { setSaving(false); } };
  return <Modal open={open} title={stock ? 'Editar Estoque' : 'Cadastrar Estoque'} subtitle="Quantidade atual e nível mínimo" onClose={onClose} onSave={save} saveLabel={stock ? 'Salvar alterações' : 'Salvar Estoque'} saving={saving}>
    {!stock && <div className="form-group"><label className="form-label">Produto</label><select className="form-select" name="produtoId" value={form.produtoId} onChange={change}><option value="">Selecione um produto</option>{products.map((product) => <option key={product.id} value={product.id}>{product.nome}</option>)}</select></div>}
    <div className="form-row"><div className="form-group"><label className="form-label">Quantidade Atual</label><input className="form-input" name="quantidadeAtual" type="number" min="0" value={form.quantidadeAtual} onChange={change} /></div><div className="form-group"><label className="form-label">Quantidade Mínima</label><input className="form-input" name="quantidadeMinima" type="number" min="0" value={form.quantidadeMinima} onChange={change} /></div></div>
  </Modal>;
}
