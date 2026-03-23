import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './app/route.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { notFoundHandler, globalErrorHandler } from './middleware/errorHandler.js';

export const createApp = (allowedOrigins) => {
  const app = express();
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // ── Trust proxy ──────────────────────────────────────────────────────────────
  app.set('trust proxy', parseInt(process.env.TRUST_PROXY_HOPS || '1', 10));

  // ── Core middleware ───────────────────────────────────────────────────────────
  app.use(
    morgan(isDevelopment ? 'dev' : ':method :url :status :res[content-length] - :response-time ms')
  );
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(apiLimiter);

  // ── Health check ──────────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  // ── Domain routes ─────────────────────────────────────────────────────────────
  app.use('/', routes);

  // ── Error handling ────────────────────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
};
