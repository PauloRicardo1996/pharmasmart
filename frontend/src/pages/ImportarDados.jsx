import React, { useMemo, useRef, useState } from 'react';
import { ErrorState, LoadingState } from '../components/AsyncState.jsx';
import { confirmarImportacao, validarPeriodo } from '../services/importacaoService.js';

const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const fileFields = [['estoque', 'Estoque do mês'], ['entradas', 'Entradas do mês'], ['vendas', 'Vendas do mês']];

function FileCard({ field, label, file, onChange }) {
  const input = useRef();
  const choose = (nextFile) => {
    if (!nextFile) return;
    const valid = ['.xls', '.xlsx', '.csv'].some((extension) => nextFile.name.toLowerCase().endsWith(extension));
    onChange(field, valid ? nextFile : null, valid ? '' : 'Formato inválido. Use .xls, .xlsx ou .csv.');
  };
  return <div className="card" style={{ padding: 16 }}><div className="card-title">{label}</div><div className="dropzone" style={{ marginTop: 12, padding: 24 }} onClick={() => input.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); choose(event.dataTransfer.files?.[0]); }}><input ref={input} type="file" accept=".xls,.xlsx,.csv" hidden onChange={(event) => choose(event.target.files?.[0])} /><div className="drop-icon">⇧</div><div className="drop-title">{file ? file.name : 'Selecione ou arraste o arquivo'}</div><div className="muted">.xls, .xlsx ou .csv · máximo 10 MB</div></div></div>;
}

function Metric({ label, value }) { return <div className="kpi-card"><div className="kpi-label">{label}</div><div className="kpi-value" style={{ fontSize: 22 }}>{value}</div></div>; }

function PreviewTable({ title, rows }) {
  if (!rows?.length) return null;
  const columns = Object.keys(rows[0]).filter((key) => key !== 'original').slice(0, 8);
  return <div className="card" style={{ marginTop: 14 }}><div className="card-header"><div className="card-title">{title}</div><div className="card-sub">Primeiras {rows.length} linhas normalizadas</div></div><div style={{ overflowX: 'auto' }}><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.linha || index}-${index}`}>{columns.map((column) => <td key={column}>{Array.isArray(row[column]) ? row[column].join(', ') : String(row[column] ?? '—')}</td>)}</tr>)}</tbody></table></div></div>;
}

function periodLabel(period) {
  const month = period?.month || period?.mes;
  return month ? `${months[month - 1]}/${period.year || period.ano}` : '';
}

export default function ImportarDados() {
  const [month, setMonth] = useState(8); const [year, setYear] = useState(2026);
  const [files, setFiles] = useState({ estoque: null, entradas: null, vendas: null }); const [fileErrors, setFileErrors] = useState({});
  const [loading, setLoading] = useState(false); const [confirming, setConfirming] = useState(false); const [error, setError] = useState(''); const [result, setResult] = useState(null); const [showConfirm, setShowConfirm] = useState(false);
  const allFilesSelected = useMemo(() => fileFields.every(([field]) => files[field]), [files]);
  const updateFile = (field, file, message) => { setFiles((current) => ({ ...current, [field]: file })); setFileErrors((current) => ({ ...current, [field]: message })); setResult(null); setError(''); };
  const validate = async () => {
    const missing = fileFields.find(([field]) => !files[field]);
    if (missing) { setError(`Informe o relatório de ${missing[1].replace(' do mês', '')} para continuar.`); return; }
    setLoading(true); setError(''); setResult(null);
    try { const response = await validarPeriodo({ month, year, ...files }); setResult(response.data); } catch (requestError) { setError(requestError.message); } finally { setLoading(false); }
  };
  const confirm = async () => {
    setConfirming(true); setError('');
    try { const response = await confirmarImportacao({ month, year, ...files }); setResult(response.data); setShowConfirm(false); } catch (requestError) { setError(requestError.status === 409 ? requestError.message : 'Não foi possível importar o período. Nenhum dado foi gravado.'); setShowConfirm(false); } finally { setConfirming(false); }
  };
  const imported = result?.status === 'IMPORTADO';
  return <><div className="page-toolbar"><div><div className="page-heading">Importar Dados</div><div className="page-sub">Valide o pacote mensal e confirme a gravação transacional no banco.</div></div></div><div className="card" style={{ padding: 18, marginBottom: 14 }}><div className="card-title">Período de referência</div><div className="filter-row" style={{ marginTop: 12 }}><select className="form-select" value={month} onChange={(event) => { setMonth(Number(event.target.value)); setResult(null); }} style={{ maxWidth: 220 }}>{months.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select><input className="form-input" type="number" min="2000" max="2100" value={year} onChange={(event) => { setYear(Number(event.target.value)); setResult(null); }} style={{ maxWidth: 130 }} /></div></div><div className="grid-3">{fileFields.map(([field, label]) => <FileCard key={field} field={field} label={label} file={files[field]} onChange={updateFile} />)}</div>{Object.values(fileErrors).some(Boolean) && <ErrorState message={Object.values(fileErrors).filter(Boolean).join(' ')} />}<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 18 }}><button className="btn btn-primary" disabled={loading || confirming || !allFilesSelected} onClick={validate}>{loading ? 'Validando...' : 'Validar período'}</button>{result?.status === 'PREPARADO_PARA_IMPORTACAO' && <button className="btn btn-primary" disabled={loading || confirming} onClick={() => setShowConfirm(true)}>Confirmar Importação</button>}</div>{!allFilesSelected && !error && <div className="card" style={{ padding: 16, marginBottom: 14, color: 'var(--amber)' }}>Selecione os três relatórios mensais para continuar.</div>}{error && <ErrorState message={error} />}{loading && <LoadingState message="Lendo e validando os três arquivos..." />}{confirming && <LoadingState message="Importando período..." />}{result && <div className="card" style={{ padding: 18 }}><div className="card-title">{imported ? 'Período importado com sucesso' : 'Pacote validado e preparado'}</div><div className="card-sub" style={{ marginBottom: 14 }}>{periodLabel(result.periodo)} · {imported ? 'dados gravados em uma única transação' : 'nenhum dado foi gravado'}</div>{imported ? <div className="kpi-grid"><Metric label="Produtos criados" value={result.resumo.produtosCriados} /><Metric label="Estoques atualizados" value={result.resumo.estoquesAtualizados} /><Metric label="Entradas mensais" value={result.resumo.entradasMensaisCriadas} /><Metric label="Vendas criadas" value={result.resumo.vendasCriadas} /></div> : <><div className="kpi-grid"><Metric label="Produtos no estoque" value={result.cruzamento.produtosEstoque} /><Metric label="Produtos nas entradas" value={result.cruzamento.produtosEntradas} /><Metric label="Produtos nas vendas" value={result.cruzamento.produtosVendas} /><Metric label="Encontrados nos três" value={result.cruzamento.encontradosNosTres} /></div><div className="grid-3"><Metric label="Linhas de estoque" value={result.estoque.totalLinhas} /><Metric label="Entradas únicas" value={result.entradas.entradasUnicas} /><Metric label="Linhas de vendas" value={result.vendas.totalLinhas} /></div></>}{result.warnings?.length > 0 && <div className="card" style={{ padding: 14, marginTop: 14, background: 'var(--amber-light)', color: '#92400E' }}><strong>Warnings</strong>{result.warnings.map((warning, index) => <div key={`${warning.tipo}-${index}`} style={{ marginTop: 6 }}>{warning.message}</div>)}</div>}{!imported && <><PreviewTable title="Preview do estoque" rows={result.estoque.preview} /><PreviewTable title="Preview das entradas" rows={result.entradas.preview} /><PreviewTable title="Preview das vendas" rows={result.vendas.preview} /></>}</div>}{showConfirm && <div role="dialog" aria-modal="true" className="modal-overlay"><div className="modal" style={{ maxWidth: 480 }}><div className="modal-title">Confirmar importação</div><p>Confirma a importação de {periodLabel({ month, year })}?</p><p className="muted">Os dados de estoque, entradas e vendas serão gravados no PharmaSmart.</p><div className="modal-footer"><button className="btn btn-ghost" disabled={confirming} onClick={() => setShowConfirm(false)}>Cancelar</button><button className="btn btn-primary" disabled={confirming} onClick={confirm}>{confirming ? 'Importando...' : 'Confirmar Importação'}</button></div></div></div>}</>;
}
