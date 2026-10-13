import React from 'react';
import Modal from './Modal.jsx';
export default function ConfirmModal({ open, title = 'Confirmar exclusão', message, onClose, onConfirm, loading = false }) { return <Modal open={open} title={title} subtitle={message} onClose={onClose} onSave={onConfirm} saveLabel="Excluir" saving={loading} />; }
