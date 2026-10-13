import React, { useEffect } from 'react';
export default function Toast({ message, onClose }) { useEffect(() => { if (!message) return; const id = setTimeout(onClose, 3000); return () => clearTimeout(id); }, [message, onClose]); return message ? <div className="toast show"><span className="toast-dot" />{message}</div> : null; }
