import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { badRequest } from '../utils/apiError.js';

export const AUTH_COOKIE = 'pharmasmart_session';
export const SESSION_SECONDS = 8 * 60 * 60;
const LOGIN = /^[a-z0-9._-]{3,80}$/;

function secret() { if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET não configurado.'); return process.env.JWT_SECRET; }
export function normalizeLogin(value) { return String(value || '').trim().toLowerCase(); }
export function publicUser(user) { return { id: user.id, nome: user.nome, login: user.login, perfil: user.perfil }; }
export function hashPassword(password) { return bcrypt.hash(password, 12); }
export function signSession(user) { return jwt.sign({ sub: String(user.id) }, secret(), { expiresIn: SESSION_SECONDS }); }
export function verifySession(token) { return jwt.verify(token, secret()); }
export async function login(loginValue, senha) { const normalizedLogin = normalizeLogin(loginValue); if (!LOGIN.test(normalizedLogin) || !senha) throw badRequest('INVALID_LOGIN_PAYLOAD', 'Login e senha são obrigatórios.'); const user = await prisma.usuario.findUnique({ where: { login: normalizedLogin } }); if (!user || !user.ativo || !(await bcrypt.compare(String(senha), user.senhaHash))) return null; return { user: publicUser(user), token: signSession(user) }; }
export async function findActiveUser(id) { const user = await prisma.usuario.findFirst({ where: { id: Number(id), ativo: true } }); return user ? publicUser(user) : null; }
export { LOGIN };
