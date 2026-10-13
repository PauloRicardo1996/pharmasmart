import React from 'react';

export function LoadingState({ message = 'Carregando...' }) { return <div className="async-state"><span className="loading-spinner" />{message}</div>; }
export function EmptyState({ message }) { return <div className="async-state empty-state">{message}</div>; }
export function ErrorState({ message, onRetry }) { return <div className="async-state error-state"><div>{message}</div>{onRetry && <button className="btn btn-ghost" onClick={onRetry}>Tentar novamente</button>}</div>; }
export function Pagination({ page, totalPages, onChange }) { if (!totalPages || totalPages <= 1) return null; return <div className="pagination"><button className="btn btn-ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>Anterior</button><span>Página {page} de {totalPages}</span><button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Próxima</button></div>; }
