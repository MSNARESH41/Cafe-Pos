import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import menuRoutes from './routes/menu.js';
import orderRoutes from './routes/orders.js';
import dashboardRoutes from './routes/dashboard.js';

export function createApp() {
  const app = express();
  const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',').map(s => s.trim()).filter(Boolean);
  app.use(helmet());
  app.use(cors({ origin(origin, callback) {
    if (!origin || origins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  }, credentials: false }));
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'CafePOS API' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/menu', menuRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));
  app.use((err, _req, res, _next) => {
    if (err.name === 'ValidationError' || err.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid request data' });
    }
    if (err.code === 11000) return res.status(409).json({ message: 'A record with this value already exists' });
    if (err.message === 'Origin not allowed by CORS') return res.status(403).json({ message: err.message });
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  });
  return app;
}
