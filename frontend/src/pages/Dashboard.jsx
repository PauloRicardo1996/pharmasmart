import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KpiCard from '../components/KpiCard.jsx';
import { Chip } from '../components/StatusBadge.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/AsyncState.jsx';
import { getDashboard } from '../services/dashboardService.js';

const riskLabel = { CRITICO: 'Crítico', ALTO: 'Alto', MEDIO: 'Médio', BAIXO: 'Baixo', SEM_DEMANDA: 'Sem demanda', DADO_ANOMALO: 'Dado anômalo' };
const riskTone = { CRITICO: 'red', ALTO: 'red', MEDIO: 'amber', BAIXO: 'green' };
const formatNumber = (value, maximumFractionDigits = 0) => value === null || value === undefined ? '—' : Number(value).toLocaleString('pt-BR', { maximumFractionDigits });
const formatUnits = (value) => `${formatNumber(value, 3)} un.`;
const variationText = (value) => value === null ? 'Sem comparação disponível' : `${value >= 0 ? '▲' : '▼'} ${formatNumber(Math.abs(value), 2)}% vs. período anterior`;

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [period, setPeriod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = async (selectedPeriod = period) => {
    setLoading(true); setError('');
    try { const response = await getDashboard(selectedPeriod); setDashboard(response.data); }
    catch { setError('Não foi possível carregar os dados do Dashboard.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  const selectPeriod = (event) => { const selected = JSON.parse(event.target.value); setPeriod(selected); load(selected); };

  if (loading && !dashboard) return <LoadingState message="Carregando dados reais do Dashboard..." />;
  if (error && !dashboard) return <ErrorState message={error} onRetry={() => load()} />;
  if (!dashboard || dashboard.semDados) return <EmptyState message="Nenhum período importado." />;

  const { periodo, periodosDisponiveis = [], vendas, entradas, estoque, reposicao, riscos, topProdutos, produtosCriticos, qualidadeDados } = dashboard;
  return <>
    <div className="page-toolbar"><div><div className="page-heading">Dashboard</div><div className="page-sub">Visão executiva e operacional do período mais recente</div></div><label className="dashboard-period">Período<select aria-label="Selecionar período do Dashboard" value={JSON.stringify(periodo)} onChange={selectPeriod}>{periodosDisponiveis.map((item) => <option key={item.label} value={JSON.stringify(item)}>{item.label}</option>)}</select></label></div>
    {error && <ErrorState message={error} onRetry={() => load()} />}
    <div className="history-notice">Os indicadores de demanda utilizam {dashboard.historicoDisponivel} {dashboard.historicoDisponivel === 1 ? 'mês' : 'meses'} de histórico disponíveis.</div>
    <div className="kpi-grid dashboard-kpis"><KpiCard label="Vendas do período" value={formatUnits(vendas.quantidade)} meta={variationText(vendas.variacaoPercentual)} /><KpiCard label="Entradas do período" value={formatUnits(entradas.quantidade)} meta={variationText(entradas.variacaoPercentual)} tone="green" /><KpiCard label="Produtos em estoque" value={formatNumber(estoque.produtos)} meta={`${formatNumber(estoque.positivos)} positivos · ${formatNumber(estoque.zerados)} zerados`} /><KpiCard label="Sugestões de compra" value={formatNumber(reposicao.sugestoes)} tone="blue" meta={`${formatUnits(reposicao.quantidadeSugerida)} sugeridos`} /><KpiCard label="Risco de ruptura" value={formatNumber(reposicao.criticos + reposicao.altos)} tone="red" meta={`${formatNumber(reposicao.criticos)} críticos · ${formatNumber(reposicao.altos)} altos`} /><KpiCard label="Dados anômalos" value={formatNumber(qualidadeDados.dadosAnomalos)} tone="amber" meta="Alerta de qualidade dos dados" /></div>
    <div className="grid-2"><div className="card"><div className="card-header"><div><div className="card-title">Risco de ruptura</div><div className="card-sub">Distribuição dos cálculos do período</div></div></div><RiskBars risks={riscos} /></div><div className="card"><div className="card-header"><div><div className="card-title">Comparação mensal</div><div className="card-sub">Vendas e entradas por período disponível</div></div></div><PeriodBars periods={periodosDisponiveis} /></div></div>
    <div className="grid-2"><div className="card"><div className="card-header"><div><div className="card-title">Produtos com maior demanda</div><div className="card-sub">Top 10 de {periodo.label}</div></div></div>{topProdutos.length ? topProdutos.map((item, index) => <div className="rec-item" key={item.produto.codigoExterno}><div className="rec-rank">{String(index + 1).padStart(2, '0')}</div><div className="rec-info"><div className="rec-name">{item.produto.nome}</div><div className="rec-meta">Código: {item.produto.codigoExterno}{item.estoqueAtual !== null ? ` · Estoque: ${formatNumber(item.estoqueAtual, 3)}` : ''}</div></div><div><div className="rec-qty-val">{formatNumber(item.quantidadeVendida)}</div><div className="rec-qty-label">unidades</div></div></div>) : <EmptyState message="Nenhuma venda no período." />}</div><div className="card"><div className="card-header"><div><div className="card-title">Atenção imediata</div><div className="card-sub">Produtos críticos ordenados por cobertura</div></div><button className="btn btn-ghost" onClick={() => navigate('/sugestoes')}>Ver sugestões</button></div>{!reposicao.possuiCalculo ? <EmptyState message="Não há cálculo de reposição gerado para este período." /> : produtosCriticos.length ? produtosCriticos.slice(0, 5).map((item) => <div className="alert-item" key={item.produto.codigoExterno}><div className="alert-icon red">!</div><div className="alert-copy"><div className="alert-name">{item.produto.nome} <Chip tone="red">Crítico</Chip></div><div className="alert-desc">Estoque: {formatNumber(item.estoqueAtual, 3)} · Cobertura: {item.coberturaDias === null ? '—' : `${formatNumber(item.coberturaDias, 1)} dias`} · Sugestão: {item.quantidadeSugerida === null ? '—' : `${formatNumber(item.quantidadeSugerida)} un.`}</div></div>{item.sugestaoId && <button className="btn btn-primary" onClick={() => navigate('/sugestoes')}>Ver sugestão</button>}</div>) : <EmptyState message="Nenhum produto crítico no período." />}</div></div>
    <div className="card dashboard-quality"><div className="card-header"><div><div className="card-title">Qualidade dos dados</div><div className="card-sub">Indicadores para apoiar a leitura do período</div></div></div><div className="quality-grid"><div><strong>{formatNumber(qualidadeDados.dadosAnomalos)}</strong><span>dados anômalos</span></div><div><strong>{formatNumber(qualidadeDados.historicoInsuficiente)}</strong><span>com histórico insuficiente</span></div><div><strong>{formatNumber(qualidadeDados.estoqueNegativo)}</strong><span>estoques negativos</span></div><div><strong>{dashboard.historicoDisponivel}</strong><span>meses analisados</span></div></div></div>
  </>;
}

function RiskBars({ risks }) { const visible = ['CRITICO', 'ALTO', 'MEDIO', 'BAIXO']; const max = Math.max(1, ...visible.map((risk) => risks[risk] || 0)); return <div className="dashboard-bars">{visible.map((risk) => <div className="dashboard-bar-row" key={risk}><span>{riskLabel[risk]}</span><div className="dashboard-bar-track"><div className={`dashboard-bar-fill ${riskTone[risk]}`} style={{ width: `${((risks[risk] || 0) / max) * 100}%` }} /></div><strong>{formatNumber(risks[risk] || 0)}</strong></div>)}<div className="card-sub dashboard-extra-risk">Sem demanda: {formatNumber(risks.SEM_DEMANDA || 0)} · Dado anômalo: {formatNumber(risks.DADO_ANOMALO || 0)}</div></div>; }
function PeriodBars({ periods }) { const rows = periods.slice(-6); const max = Math.max(1, ...rows.flatMap((period) => [period.vendas || 0, period.entradas || 0])); return <div className="dashboard-period-bars">{rows.map((period) => <div className="period-bar-group" key={period.label}><div className="period-bar-values"><div className="period-bar sales" style={{ height: `${((period.vendas || 0) / max) * 100}%` }} title={`Vendas: ${formatUnits(period.vendas || 0)}`} /><div className="period-bar entries" style={{ height: `${((period.entradas || 0) / max) * 100}%` }} title={`Entradas: ${formatUnits(period.entradas || 0)}`} /></div><span>{period.label}</span></div>)}<div className="legend"><span className="legend-sales">■ Vendas</span><span className="legend-entries">■ Entradas</span></div></div>; }
