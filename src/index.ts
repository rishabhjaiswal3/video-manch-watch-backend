/**
 * VideoManch API Server
 *
 * Architecture: Modular Monolith with 4 Domains
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │                      API SERVER (this file)                 │
 *   ├─────────────┬────────────┬───────────────┬─────────────────┤
 *   │   AUTH       │   MEDIA    │  ANALYTICS    │     ADMIN       │
 *   │             │            │               │                 │
 *   │  /auth/*    │  /upload/* │  /analytics/* │  /admin/*       │
 *   │             │  /videos/* │  /playback/*  │  /config/*      │
 *   │             │            │               │                 │
 *   │  signup     │  init      │  overview     │  users          │
 *   │  login      │  complete  │  videos       │  roles          │
 *   │  logout     │  status    │  trends       │  stats          │
 *   │  refresh    │  stream    │  events       │  player config  │
 *   └─────────────┴────────────┴───────────────┴─────────────────┘
 *
 *   The Analytics Worker runs as a SEPARATE process (src/worker.ts)
 *   to isolate event processing from the API serving path.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { disconnectRedis } from './config/redis.js';
import { loadEnvironment } from './config/env.js';

// Domain route imports
import authRoutes from './domains/auth/routes.js';
import uploadRoutes from './domains/media/upload.routes.js';
import videosRoutes from './domains/media/videos.routes.js';
import playbackRoutes from './domains/analytics/playback.routes.js';
import creatorAnalyticsRoutes from './domains/analytics/creator.routes.js';
import adminRoutes from './domains/admin/admin.routes.js';
import configRoutes from './domains/admin/config.routes.js';

// Shared middleware
import { apiLimiter } from './middleware/rateLimiter.js';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Validate environment variables first (exits if invalid)
const env = loadEnvironment();

const app = express();
const PORT = env.PORT;

// Track server state
let isShuttingDown = false;
let server: http.Server;

// ─── Health Check (before any middleware) ───────────────

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'videomanch-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── Middleware ─────────────────────────────────────────

// CORS — allow multiple origins (comma-separated in FRONTEND_URL env var)
const allowedOrigins = env.FRONTEND_URL.split(',').map(url => url.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
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

// Request logging in development
if (env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// Shutdown check — reject new requests during shutdown
app.use((req, res, next) => {
  if (isShuttingDown) {
    res.status(503).json({
      success: false,
      error: 'Server is shutting down. Please try again later.',
    });
    return;
  }
  next();
});

// ─── Domain Routes ─────────────────────────────────────
//
// Path mapping (same paths as before — zero breaking changes):
//
//   AUTH domain:
app.use('/auth', authRoutes);
//
//   MEDIA domain (upload + video catalog + streaming):
app.use('/upload', uploadRoutes);
app.use('/videos', videosRoutes);
//
//   ANALYTICS domain (playback events + creator analytics):
app.use('/playback', playbackRoutes);
app.use('/analytics', creatorAnalyticsRoutes);
//
//   ADMIN domain (user management + platform config):
app.use('/admin', adminRoutes);
app.use('/config', configRoutes);


// ─── Error Handling ────────────────────────────────────

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(globalErrorHandler);

// ─── Graceful Shutdown ─────────────────────────────────

const gracefulShutdown = async (signal: string) => {
  console.log(`\n[SHUTDOWN] Received ${signal}. Starting graceful shutdown...`);
  isShuttingDown = true;

  // Stop accepting new connections
  server.close(async () => {
    console.log('[SHUTDOWN] HTTP server closed');

    try {
      // Close database connections
      console.log('[SHUTDOWN] Closing database connections...');
      await Promise.allSettled([
        disconnectDatabase(),
        disconnectRedis(),
      ]);

      console.log('[SHUTDOWN] All connections closed. Exiting...');
      process.exit(0);
    } catch (error) {
      console.error('[SHUTDOWN] Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('[SHUTDOWN] Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// ─── Error & Signal Handlers ───────────────────────────

process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ─── Start Server ──────────────────────────────────────

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();

    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n${'='.repeat(56)}`);
      console.log(`  VideoManch API Server`);
      console.log(`${'─'.repeat(56)}`);
      console.log(`  Port:        ${PORT}`);
      console.log(`  Environment: ${env.NODE_ENV}`);
      console.log(`  Health:      http://localhost:${PORT}/health`);
      console.log(`${'─'.repeat(56)}`);
      console.log(`  Domains:`);
      console.log(`    AUTH      → /auth/*`);
      console.log(`    MEDIA     → /upload/*, /videos/*`);
      console.log(`    ANALYTICS → /playback/*, /analytics/*`);
      console.log(`    ADMIN     → /admin/*, /config/*`);
      console.log(`${'─'.repeat(56)}`);
      console.log(`  ⚠️  Analytics Worker runs separately: npm run worker:dev`);
      console.log(`${'='.repeat(56)}\n`);
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`[FATAL] Port ${PORT} is already in use`);
        process.exit(1);
      }
      throw error;
    });
  } catch (error) {
    console.error('[FATAL] Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
