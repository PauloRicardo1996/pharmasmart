import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import Topbar from '../components/Topbar.jsx';
import { ToastProvider } from '../components/ToastContext.jsx';
import { getHealth } from '../services/api.js';
import '../styles/layout.css';

export default function AppLayout({ profile, onLogout, children }) {
  const [apiOnline, setApiOnline] = useState(null);
  useEffect(() => { getHealth().then(() => setApiOnline(true)).catch(() => setApiOnline(false)); }, []);
  return <ToastProvider><div className="app"><Sidebar profile={profile} onLogout={onLogout}/><div className="main"><Topbar apiOnline={apiOnline}/><div className="content">{children}</div></div></div></ToastProvider>;
}
