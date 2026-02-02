import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { disconnectRedis } from './config/redis.js';
import { loadEnvironment } from './config/env.js';
import authRoutes from './routes/auth.js';
import uploadRoutes from './routes/upload.js';
import analyticsRoutes from './routes/analytics.js';
import playbackRoutes from './routes/playback.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Validate environment variables first (exits if invalid)
const env = loadEnvironment();

const app = express();
const PORT = env.PORT;

// Track server state
let isShuttingDown = false;
let server: http.Server;

// Health check FIRST - before any middleware
// This ensures Railway's health checker can always reach it
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Middleware
app.use(cors({
  origin: env.FRONTEND_URL,
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

// Shutdown check middleware - reject new requests during shutdown
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/playback', playbackRoutes);


// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(globalErrorHandler);

// Graceful shutdown function
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

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();

    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`Server running on 0.0.0.0:${PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`${'='.repeat(50)}\n`);
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
