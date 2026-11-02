import { AUTH_COOKIE, SESSION_SECONDS, login, publicUser } from '../services/authService.js';
import { registrarAuditoria, requestMeta } from '../services/auditoriaService.js';
const cookieOptions = () => `Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
export async function signIn(req, res) { const result = await login(req.body?.login, req.body?.senha); if (!result) return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Login ou senha inválidos.' } }); await registrarAuditoria({ usuarioId: result.user.id, acao: 'LOGIN', recurso: 'AUTENTICACAO', descricao: 'Login realizado com sucesso.', ...requestMeta(req) }); res.setHeader('Set-Cookie', `${AUTH_COOKIE}=${encodeURIComponent(result.token)}; ${cookieOptions()}`); return res.json({ data: { user: result.user } }); }
export function signOut(_req, res) { const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''; res.setHeader('Set-Cookie', `${AUTH_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`); res.json({ data: { loggedOut: true } }); }
export function me(req, res) { res.json({ data: publicUser(req.user) }); }
