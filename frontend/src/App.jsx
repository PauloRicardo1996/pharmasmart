import React, { useState } from 'react';
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

const routes = ['/dashboard','/estoque','/historico','/sugestoes','/pedidos','/fornecedores','/importar','/relatorios','/configuracoes'];
function Protected({ children }) { return localStorage.getItem('pharmasmart-profile') ? children : <Navigate to="/login" replace />; }

export default function App() {
  const [profile, setProfile] = useState(() => localStorage.getItem('pharmasmart-profile') || '');
  const navigate = useNavigate();
  const location = useLocation();
  const login = (nextProfile) => { localStorage.setItem('pharmasmart-profile', nextProfile); setProfile(nextProfile); navigate('/dashboard'); };
  const logout = () => { localStorage.removeItem('pharmasmart-profile'); setProfile(''); navigate('/login'); };
  if (location.pathname === '/login') return <Login onLogin={login} />;
  return <Protected><AppLayout profile={profile} onLogout={logout}><Routes>
    <Route path="/dashboard" element={<Dashboard />} /><Route path="/estoque" element={<Estoque />} />
    <Route path="/historico" element={<HistoricoVendas />} /><Route path="/sugestoes" element={<SugestoesCompra />} />
    <Route path="/pedidos" element={<PedidosCompra />} /><Route path="/fornecedores" element={<Fornecedores />} />
    <Route path="/importar" element={<ImportarDados />} /><Route path="/relatorios" element={<Relatorios />} />
    <Route path="/configuracoes" element={<Configuracoes />} /><Route path="*" element={<Navigate to={routes[0]} replace />} />
  </Routes></AppLayout></Protected>;
}
