import React, { useEffect, useState } from 'react';
import { EmptyState, ErrorState, LoadingState, Pagination } from '../components/AsyncState.jsx';
import Modal from '../components/Modal.jsx';
import { atualizarUsuario, criarUsuario, listarUsuarios } from '../services/usuarioService.js';

const profileLabel = { FARMACEUTICO: 'Farmacêutico', GERENTE: 'Gerente' };
const createEmptyForm = () => ({ nome: '', login: '', senha: '', perfil: 'FARMACEUTICO', ativo: true });

export default function Usuarios() {
  const [result, setResult] = useState({ data: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(createEmptyForm);
  const [formError, setFormError] = useState('');
  const [formInstance, setFormInstance] = useState(0);

  const load = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      setResult(await listarUsuarios({ page, limit: 20 }));
    } catch {
      setError('Não foi possível carregar os usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setForm(createEmptyForm());
    setFormError('');
  };

  const open = (user = null) => {
    setEditing(user);
    setFormError('');
    setForm(user
      ? { nome: user.nome, login: user.login, senha: '', perfil: user.perfil, ativo: user.ativo !== false }
      : createEmptyForm());
    setFormInstance((current) => current + 1);
    setModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (saving) return;

    setFormError('');
    const isCreating = !editing;
    if (!form.nome.trim() || !form.login.trim() || (isCreating && !form.senha)) {
      setFormError(isCreating ? 'Preencha nome, login e senha.' : 'Preencha nome e login.');
      return;
    }
    if (form.senha && form.senha.length < 8) {
      setFormError('A senha deve possuir pelo menos 8 caracteres.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nome: form.nome,
        login: form.login,
        perfil: form.perfil,
        ...(form.senha ? { senha: form.senha } : {}),
      };
      if (editing) {
        await atualizarUsuario(editing.id, { ...payload, ativo: form.ativo });
      } else {
        await criarUsuario(payload);
      }

      setForm(createEmptyForm());
      setFormError('');
      setModalOpen(false);
      setEditing(null);
      await load(result.pagination.page || 1);
    } catch (err) {
      setFormError(err.message || 'Não foi possível salvar o usuário.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (user) => {
    try {
      await atualizarUsuario(user.id, { ativo: user.ativo === false });
      await load(result.pagination.page || 1);
    } catch (err) {
      setError(err.message);
    }
  };

  return <>
    <div className="page-toolbar">
      <div><div className="page-heading">Usuários</div><div className="page-sub">Gerencie acessos e perfis do PharmaSmart</div></div>
      <button type="button" className="btn btn-primary" onClick={() => open()}>＋ Cadastrar usuário</button>
    </div>
    {loading && <LoadingState message="Carregando usuários..." />}
    {error && <ErrorState message={error} onRetry={() => load(result.pagination.page || 1)} />}
    {!loading && !error && !result.data.length && <EmptyState message="Nenhum usuário cadastrado." />}
    {!loading && !error && result.data.length > 0 && <div className="card"><table><thead><tr><th>Nome</th><th>Login</th><th>Perfil</th><th>Status</th><th>Ações</th></tr></thead><tbody>{result.data.map((user) => <tr key={user.id}><td>{user.nome}</td><td>{user.login}</td><td>{profileLabel[user.perfil]}</td><td>{user.ativo === false ? 'Inativo' : 'Ativo'}</td><td><button type="button" className="btn btn-ghost" onClick={() => open(user)}>Editar</button><button type="button" className="btn btn-ghost" onClick={() => toggle(user)}>{user.ativo === false ? 'Ativar' : 'Desativar'}</button></td></tr>)}</tbody></table></div>}
    {!loading && !error && <Pagination page={result.pagination.page || 1} totalPages={result.pagination.totalPages || 0} onChange={load} />}
    <Modal
      key={`${editing ? `edit-user-${editing.id}` : 'new-user'}-${formInstance}`}
      open={modalOpen}
      title={editing ? 'Editar usuário' : 'Cadastrar usuário'}
      onClose={closeModal}
      onSubmit={handleSubmit}
      form
      formName="create-pharmasmart-user"
      saveLabel="Salvar"
      saving={saving}
    >
      {formError && <div className="inline-warning" role="alert">{formError}</div>}
      <div>
        <label className="form-label" htmlFor="new-user-name">Nome
          <input id="new-user-name" name="new-user-name" className="form-input" autoComplete="off" value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} />
        </label>
        <label className="form-label" htmlFor="new-user-account-login">Login
          <input id="new-user-account-login" name="new-user-account-login" className="form-input" autoCapitalize="none" autoComplete="off" value={form.login} onChange={(event) => setForm({ ...form, login: event.target.value })} />
        </label>
        <label className="form-label" htmlFor="new-user-profile">Perfil
          <select id="new-user-profile" name="new-user-profile" className="form-select" autoComplete="off" value={form.perfil} onChange={(event) => setForm({ ...form, perfil: event.target.value })}>
            <option value="FARMACEUTICO">Farmacêutico</option><option value="GERENTE">Gerente</option>
          </select>
        </label>
        <label className="form-label" htmlFor="new-user-password">Senha {editing ? '(deixe vazio para manter)' : ''}
          <input id="new-user-password" name="new-user-password" className="form-input" type="password" autoComplete="new-password" value={form.senha} onChange={(event) => setForm({ ...form, senha: event.target.value })} />
        </label>
        {editing && <label className="form-label"><input type="checkbox" checked={form.ativo} onChange={(event) => setForm({ ...form, ativo: event.target.checked })} /> Usuário ativo</label>}
      </div>
    </Modal>
  </>;
}
