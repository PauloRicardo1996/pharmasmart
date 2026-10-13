import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Topbar({ apiOnline }) {
  const location = useLocation(); const navigate = useNavigate();
  const titles = { '/dashboard':'Dashboard','/estoque':'Estoque / Produtos','/historico':'Histórico de Vendas','/sugestoes':'Sugestões de Compra','/pedidos':'Pedidos de Compra','/fornecedores':'Fornecedores','/importar':'Importar Dados','/relatorios':'Relatórios','/configuracoes':'Parâmetros de Reposição' };
  return <header className="topbar"><div className="topbar-title">{titles[location.pathname] || 'Dashboard'}</div><div className="topbar-right"><div className={`api-status ${apiOnline === false ? 'offline' : ''}`}><span className="api-status-dot" />{apiOnline === false ? 'Servidor indisponível' : apiOnline === true ? 'API conectada' : 'Verificando API...'}</div><div className="search-bar"><span>⌕</span><input placeholder="Buscar produto..." /></div><button className="icon-btn" onClick={() => navigate('/sugestoes')}>♧<span className="notif-dot" /></button><button className="btn btn-primary" onClick={() => navigate('/estoque?modal=produto')}>＋ Cadastrar Produto</button></div></header>;
}
