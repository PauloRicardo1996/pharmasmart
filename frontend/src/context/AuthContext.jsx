import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { request } from '../services/api.js';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => { request('/auth/me').then((response) => setUser(response.data)).catch(() => setUser(null)).finally(() => setLoading(false)); }, []);
  const value = useMemo(() => ({ user, loading, async login(loginValue, senha) { const response = await request('/auth/login', { method: 'POST', body: JSON.stringify({ login: loginValue, senha }) }); setUser(response.data.user); return response.data.user; }, async logout() { await request('/auth/logout', { method: 'POST' }).catch(() => {}); setUser(null); } }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth deve ser usado dentro de AuthProvider.'); return value; }
