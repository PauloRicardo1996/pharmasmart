import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/healthRoutes.js';
import produtoRoutes from './routes/produtoRoutes.js';
import estoqueRoutes from './routes/estoqueRoutes.js';
import fornecedorRoutes from './routes/fornecedorRoutes.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());
app.get('/', (_req, res) => res.json({ application: 'PharmaSmart', message: 'API online' }));
app.use('/api/health', healthRoutes);
app.use('/api/produtos', produtoRoutes);
app.use('/api/estoque', estoqueRoutes);
app.use('/api/fornecedores', fornecedorRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;
