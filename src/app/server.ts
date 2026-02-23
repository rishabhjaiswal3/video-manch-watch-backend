import express from 'express';
import cors from 'cors';
import { apiLimiter } from '../shared/middleware/rateLimiter.js';
import { globalErrorHandler, notFoundHandler } from '../shared/middleware/errorHandler.js';
import { registerRoutes } from './routes.js';

export function createServer(allowedOrigins: string[], nodeEnv: string, trustProxyHops: number) {
  const app = express();

  if (Number.isFinite(trustProxyHops) && trustProxyHops > 0) {
    app.set('trust proxy', trustProxyHops);
  }

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'videomanch-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log(`[CORS] Blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(apiLimiter as any);

  if (nodeEnv !== 'production') {
    app.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });
  }

  registerRoutes(app);

  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
}
