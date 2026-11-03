import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import healthRoutes from './routes/healthRoutes.js';
import produtoRoutes from './routes/produtoRoutes.js';
import estoqueRoutes from './routes/estoqueRoutes.js';
import fornecedorRoutes from './routes/fornecedorRoutes.js';
import importacaoRoutes from './routes/importacaoRoutes.js';
import reposicaoRoutes from './routes/reposicaoRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import historicoRoutes from './routes/historicoRoutes.js';
import pedidoRoutes from './routes/pedidoRoutes.js';
import configuracaoRoutes from './routes/configuracaoRoutes.js';
import relatorioRoutes from './routes/relatorioRoutes.js';
import authRoutes from './routes/authRoutes.js';
import usuarioRoutes from './routes/usuarioRoutes.js';
import auditoriaRoutes from './routes/auditoriaRoutes.js';
import { requireAuth, requireRole } from './middlewares/auth.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const frontendDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
const allowedOrigins = new Set([
  process.env.FRONTEND_URL,
  process.env.RENDER_EXTERNAL_URL,
  isProduction ? 'https://pharmasmart-3jr7.onrender.com' : null,
  'http://localhost:5173',
].filter(Boolean));
if (isProduction) app.set('trust proxy', 1);
app.use((req, res, next) => {
  const origin = req.get('origin');
  const sameOrigin = origin && origin === `${req.protocol}://${req.get('host')}`;
  if (!origin || sameOrigin || allowedOrigins.has(origin)) {
    return cors({ origin: origin || true, credentials: true })(req, res, next);
  }
  return next(new Error('Origin not allowed.'));
});
app.use(express.json());
app.get('/', (_req, res) => { if (isProduction && fs.existsSync(path.join(frontendDist, 'index.html'))) return res.sendFile(path.join(frontendDist, 'index.html')); return res.json({ application: 'PharmaSmart', message: 'API online' }); });
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/assets/')) return next();
    return res.sendFile(path.join(frontendDist, 'index.html'));
  });
  app.all('/assets/*', (_req, res) => res.sendStatus(404));
}
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', requireAuth, requireRole('GERENTE'), usuarioRoutes);
app.use('/api/auditoria', requireAuth, requireRole('GERENTE'), auditoriaRoutes);
app.use(requireAuth);
app.use('/api/produtos', produtoRoutes);
app.use('/api/estoque', estoqueRoutes);
app.use('/api/fornecedores', fornecedorRoutes);
app.use('/api/importacoes', importacaoRoutes);
app.use('/api/reposicao', reposicaoRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/historico', historicoRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/configuracoes', configuracaoRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;
