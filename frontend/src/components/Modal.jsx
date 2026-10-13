import React from 'react';

export default function Modal({ open, title, subtitle, children, onClose, onSave, saveLabel = 'Salvar', saving = false, footer }) {
  if (!open) return null;
  return <div className="modal-overlay open" onClick={(event) => event.target === event.currentTarget && onClose()}>
    <div className="modal">
      <div className="modal-title">{title}</div>
      {subtitle && <div className="modal-sub">{subtitle}</div>}
      {children}
      {footer || <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
        <button className="btn btn-primary" onClick={onSave} disabled={saving}>{saving ? 'Salvando...' : saveLabel}</button>
      </div>}
    </div>
  </div>;
}
