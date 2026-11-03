import React from 'react';

export default function Modal({ open, title, subtitle, children, onClose, onSave, onSubmit, form = false, formName, saveLabel = 'Salvar', saving = false, footer }) {
  if (!open) return null;
  const Content = form ? 'form' : 'div';
  return <div className="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(event) => event.target === event.currentTarget && onClose()}>
    <Content className="modal" name={form ? formName : undefined} autoComplete={form ? 'off' : undefined} onSubmit={form ? onSubmit : undefined}>
      <div className="modal-title" id="modal-title">{title}</div>
      {subtitle && <div className="modal-sub">{subtitle}</div>}
      {children}
      {footer || <div className="modal-footer">
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
        <button type={form ? 'submit' : 'button'} className="btn btn-primary" onClick={form ? undefined : onSave} disabled={saving}>{saving ? 'Salvando...' : saveLabel}</button>
      </div>}
    </Content>
  </div>;
}
