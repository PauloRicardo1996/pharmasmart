import React, { createContext, useCallback, useContext, useState } from 'react';
import Toast from './Toast.jsx';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [message, setMessage] = useState('');
  const showToast = useCallback((nextMessage) => setMessage(nextMessage), []);
  return <ToastContext.Provider value={showToast}>{children}<Toast message={message} onClose={() => setMessage('')} /></ToastContext.Provider>;
}

export function useToast() { return useContext(ToastContext) || (() => {}); }
