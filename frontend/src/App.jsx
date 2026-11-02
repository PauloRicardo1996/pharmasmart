import React from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Estoque from './pages/Estoque.jsx';
import HistoricoVendas from './pages/HistoricoVendas.jsx';
import SugestoesCompra from './pages/SugestoesCompra.jsx';
import PedidosCompra from './pages/PedidosCompra.jsx';
import Fornecedores from './pages/Fornecedores.jsx';
import ImportarDados from './pages/ImportarDados.jsx';
import Relatorios from './pages/Relatorios.jsx';
import Configuracoes from './pages/Configuracoes.jsx';
import Usuarios from './pages/Usuarios.jsx';
import Auditoria from './pages/Auditoria.jsx';
import { LoadingState } from './components/AsyncState.jsx';
import { useAuth } from './context/AuthContext.jsx';

const routes = ['/dashboard','/estoque','/historico','/sugestoes','/pedidos','/fornecedores','/importar','/relatorios','/configuracoes','/usuarios','/auditoria'];
function ProtectedRoute({ children }) { const { user } = useAuth(); return user ? children : <Navigate to="/login" replace />; }
function RoleRoute({ roles, children }) { const { user } = useAuth(); return roles.includes(user?.perfil) ? children : <Navigate to="/dashboard" replace />; }

export default function App() {
  const { user, loading, logout } = useAuth(); const location = useLocation(); const navigate = useNavigate();
  if (loading) return <LoadingState message="Verificando sessão..." />;
  if (location.pathname === '/login') return user ? <Navigate to="/dashboard" replace /> : <Login />;
  return <ProtectedRoute><AppLayout user={user} onLogout={async () => { await logout(); navigate('/login', { replace: true }); }}><Routes>
    <Route path="/dashboard" element={<Dashboard />} /><Route path="/estoque" element={<Estoque />} /><Route path="/historico" element={<HistoricoVendas />} /><Route path="/sugestoes" element={<SugestoesCompra />} /><Route path="/pedidos" element={<PedidosCompra />} /><Route path="/fornecedores" element={<Fornecedores />} /><Route path="/importar" element={<ImportarDados />} /><Route path="/relatorios" element={<Relatorios />} /><Route path="/configuracoes" element={<RoleRoute roles={['GERENTE']}><Configuracoes /></RoleRoute>} /><Route path="/usuarios" element={<RoleRoute roles={['GERENTE']}><Usuarios /></RoleRoute>} /><Route path="/auditoria" element={<RoleRoute roles={['GERENTE']}><Auditoria /></RoleRoute>} /><Route path="*" element={<Navigate to={routes[0]} replace />} />
  </Routes></AppLayout></ProtectedRoute>;
}
