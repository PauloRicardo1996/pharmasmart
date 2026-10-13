import React, { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import { createFornecedor, updateFornecedor } from '../services/fornecedorService.js';

const initial = { nome: '', cnpj: '', telefone: '', email: '' };
function formatCnpj(value) { const digits = value.replace(/\D/g, '').slice(0, 14); return digits.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2'); }
export default function SupplierFormModal({ open, supplier, onClose, onSuccess, onError }) {
  const [form, setForm] = useState(initial); const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(supplier ? { nome: supplier.nome || '', cnpj: formatCnpj(supplier.cnpj || ''), telefone: supplier.telefone || '', email: supplier.email || '' } : initial); }, [supplier, open]);
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.name === 'cnpj' ? formatCnpj(event.target.value) : event.target.value }));
  const save = async () => { setSaving(true); try { const payload = { nome: form.nome, cnpj: form.cnpj.replace(/\D/g, '') || null, telefone: form.telefone || null, email: form.email || null }; if (supplier) await updateFornecedor(supplier.id, payload); else await createFornecedor(payload); onSuccess(supplier ? 'Fornecedor atualizado com sucesso.' : 'Fornecedor cadastrado com sucesso.'); onClose(); } catch (error) { onError(error); } finally { setSaving(false); } };
  return <Modal open={open} title={supplier ? 'Editar Fornecedor' : 'Cadastrar Fornecedor'} subtitle="Dados do fornecedor" onClose={onClose} onSave={save} saveLabel={supplier ? 'Salvar alterações' : 'Salvar Fornecedor'} saving={saving}>
    <div className="form-group"><label className="form-label">Nome</label><input className="form-input" name="nome" value={form.nome} onChange={change} placeholder="Nome do fornecedor" /></div>
    <div className="form-row"><div className="form-group"><label className="form-label">CNPJ (opcional)</label><input className="form-input" name="cnpj" value={form.cnpj} onChange={change} placeholder="00.000.000/0000-00" /></div><div className="form-group"><label className="form-label">Telefone</label><input className="form-input" name="telefone" value={form.telefone} onChange={change} placeholder="(00) 00000-0000" /></div></div>
    <div className="form-group"><label className="form-label">E-mail</label><input className="form-input" name="email" type="email" value={form.email} onChange={change} placeholder="vendas@fornecedor.com" /></div>
  </Modal>;
}
