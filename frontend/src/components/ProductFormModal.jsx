import React, { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import { createProduto, updateProduto } from '../services/produtoService.js';

const initial = { nome: '', principioAtivo: '', categoria: '', tipo: 'GENERICO', precoUnitario: '' };
export default function ProductFormModal({ open, product, onClose, onSuccess, onError }) {
  const [form, setForm] = useState(initial); const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(product ? { ...product, precoUnitario: product.precoUnitario ?? '' } : initial); }, [product, open]);
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const save = async () => { setSaving(true); try { const payload = { nome: form.nome, principioAtivo: form.principioAtivo, categoria: form.categoria, tipo: form.tipo, precoUnitario: Number(form.precoUnitario) }; if (product) await updateProduto(product.id, payload); else await createProduto(payload); onSuccess(product ? 'Produto atualizado com sucesso.' : 'Produto cadastrado com sucesso.'); onClose(); } catch (error) { onError(error); } finally { setSaving(false); } };
  return <Modal open={open} title={product ? 'Editar Produto' : 'Cadastrar Produto'} subtitle="Dados do medicamento · entidade produto" onClose={onClose} onSave={save} saveLabel={product ? 'Salvar alterações' : 'Salvar Produto'} saving={saving}>
    <div className="form-group"><label className="form-label">Nome do Produto</label><input className="form-input" name="nome" value={form.nome} onChange={change} placeholder="Ex: Dipirona 500mg" /></div>
    <div className="form-group"><label className="form-label">Princípio Ativo</label><input className="form-input" name="principioAtivo" value={form.principioAtivo} onChange={change} placeholder="Ex: Dipirona Sódica" /></div>
    <div className="form-row"><div className="form-group"><label className="form-label">Categoria</label><input className="form-input" name="categoria" value={form.categoria} onChange={change} placeholder="Ex: Analgésico" /></div><div className="form-group"><label className="form-label">Tipo</label><select className="form-select" name="tipo" value={form.tipo} onChange={change}><option value="GENERICO">Genérico</option><option value="SIMILAR">Similar</option><option value="MARCA">Marca</option></select></div></div>
    <div className="form-group"><label className="form-label">Preço Unitário (R$)</label><input className="form-input" name="precoUnitario" type="number" min="0" step="0.01" value={form.precoUnitario} onChange={change} placeholder="0,00" /></div>
  </Modal>;
}
