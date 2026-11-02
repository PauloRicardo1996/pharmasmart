import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { normalizeLogin, LOGIN } from '../src/services/authService.js';

dotenv.config({ path: new URL('../.env', import.meta.url) });
const required = ['ADMIN_INITIAL_NAME', 'ADMIN_INITIAL_LOGIN', 'ADMIN_INITIAL_PASSWORD'];
for (const name of required) if (!process.env[name]) throw new Error(`${name} deve ser informado para o bootstrap explícito.`);
const login = normalizeLogin(process.env.ADMIN_INITIAL_LOGIN);
if (!LOGIN.test(login)) throw new Error('ADMIN_INITIAL_LOGIN inválido.');
if (process.env.ADMIN_INITIAL_PASSWORD.length < 8) throw new Error('ADMIN_INITIAL_PASSWORD deve possuir pelo menos 8 caracteres.');
const prisma = new PrismaClient();
try {
  if (await prisma.usuario.findUnique({ where: { login } })) throw new Error('Já existe um usuário com esse login.');
  await prisma.usuario.create({ data: { nome: process.env.ADMIN_INITIAL_NAME.trim(), login, perfil: 'GERENTE', senhaHash: await bcrypt.hash(process.env.ADMIN_INITIAL_PASSWORD, 12) } });
  console.log('Usuário GERENTE criado com sucesso.');
} finally { await prisma.$disconnect(); }
