import React from 'react';

export default function Modal({ open, title, subtitle, children, onClose, onSave, saveLabel = 'Salvar', saving = false, footer }) {
  if (!open) return null;
  return <div className="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(event) => event.target === event.currentTarget && onClose()}>
    <div className="modal">
      <div className="modal-title" id="modal-title">{title}</div>
      {subtitle && <div className="modal-sub">{subtitle}</div>}
      {children}
      {footer || <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
        <button className="btn btn-primary" onClick={onSave} disabled={saving}>{saving ? 'Salvando...' : saveLabel}</button>
      </div>}
    </div>
  </div>;
}
