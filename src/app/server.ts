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

  // Baseline hardening headers without adding new dependencies.
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    if (nodeEnv === 'production') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; frame-ancestors 'none'; object-src 'none'"
      );
    }
    next();
  });

  // Enforce HTTPS in production behind proxy (Railway/Cloudflare etc.).
  if (nodeEnv === 'production') {
    app.use((req, res, next) => {
      const proto = (req.headers['x-forwarded-proto'] || '').toString().split(',')[0].trim();
      if (proto && proto !== 'https') {
        return res.status(403).json({ success: false, error: 'HTTPS required.' });
      }
      next();
    });
  }

  app.use(express.json({ limit: '35mb' }));
  app.use(express.urlencoded({ extended: true, limit: '35mb' }));
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
