import { AUTH_COOKIE, findActiveUser, verifySession } from '../services/authService.js';

function cookies(header = '') { return Object.fromEntries(header.split(';').map((part) => part.trim().split('=').map(decodeURIComponent)).filter(([key, value]) => key && value)); }

export async function requireAuth(req, res, next) {
  try {
    const token = cookies(req.headers.cookie)[AUTH_COOKIE];
    if (!token) return res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Autenticação necessária.' } });
    const payload = verifySession(token); const user = await findActiveUser(payload.sub);
    if (!user) return res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Autenticação necessária.' } });
    req.user = user; return next();
  } catch { return res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Autenticação necessária.' } }); }
}

export function requireRole(...roles) { return (req, res, next) => roles.includes(req.user?.perfil) ? next() : res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Você não tem permissão para acessar este recurso.' } }); }
