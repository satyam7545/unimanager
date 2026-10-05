import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try standard locations for .env
const candidateEnvFiles = [
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'backend', '.env'),
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', '..', 'backend', '.env'),
  path.join(__dirname, '..', '..', '.env'),
];

for (const envFile of candidateEnvFiles) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
    break;
  }
}
dotenv.config();

// Ensure critical environment variables have safe fallbacks
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'mysql://satya:$%40tyam%407545MySQL@129.154.233.66:3306/uni';
}
if (!process.env.JWT_ACCESS_SECRET) {
  process.env.JWT_ACCESS_SECRET = 'unimanager_access_super_secret_key_12345!';
}
if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = 'unimanager_refresh_super_secret_key_54321!';
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import apiRouter from './routes/api';
import { errorHandler } from './middleware/error.middleware';
import { prisma } from './utils/prisma';

const app = express();
const PORT = process.env.PORT || 5000;

// Compress all HTTP responses
app.use(compression());

// Security Middlewares with relaxed CSP for desktop/local assets
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

import { findUploadedFile, getPrimaryUploadDir } from './utils/uploads';

// Serve uploads with dynamic candidate resolution
app.get('/uploads/:filename', (req, res, next) => {
  const filename = req.params.filename;
  const filePath = findUploadedFile(filename);

  if (filePath) {
    if (filename.toLowerCase().endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
    }
    return res.sendFile(filePath);
  }
  return next();
});

const primaryUploadDir = getPrimaryUploadDir();
app.use(
  '/uploads',
  express.static(primaryUploadDir, {
    setHeaders: (res, filePath) => {
      if (filePath.toLowerCase().endsWith('.pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
      }
    },
  })
);

// CORS configuration supporting cookies, headers, and electron/localhost clients
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || origin === allowedOrigin) {
        return callback(null, true);
      }
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })
);

// Body Parser — increased limit for backup imports
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api/v1', apiRouter);

// Serve frontend build if available (production / desktop mode)
const candidateFrontendPaths = [
  process.env.FRONTEND_DIST,
  path.join(process.cwd(), 'frontend', 'dist'),
  path.join(__dirname, '../../frontend/dist'),
  path.join(__dirname, '../frontend/dist'),
  path.join(__dirname, '../../../frontend/dist'),
  (process as any).resourcesPath ? path.join((process as any).resourcesPath, 'app.asar.unpacked', 'frontend', 'dist') : undefined,
  (process as any).resourcesPath ? path.join((process as any).resourcesPath, 'frontend', 'dist') : undefined,
].filter((p): p is string => Boolean(p && typeof p === 'string'));

const frontendDist = candidateFrontendPaths.find((p) => {
  try {
    return fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'));
  } catch {
    return false;
  }
});

if (frontendDist) {
  console.log(`[Backend] Serving frontend static assets from: ${frontendDist}`);
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  // Basic route fallback for unmatched endpoints
  app.use('*', (req, res, _next) => {
    res.status(404).json({
      status: 'fail',
      message: `Can't find ${req.originalUrl} on this server.`,
    });
  });
}

// Centralized Error Middleware (Must be attached last)
app.use(errorHandler);

// Validate critical environment variables at startup
if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.error('❌ FATAL: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in .env');
  process.exit(1);
}

// Database connection verification and startup
const startServer = async () => {
  try {
    // Ping DB to verify credentials at start
    await prisma.$connect();
    console.log('🔌 Connected to MySQL Database successfully via Prisma ORM.');

    const server = app.listen(PORT, () => {
      console.log(`🚀 UniManager Backend running in [${process.env.NODE_ENV || 'development'}] mode on port ${PORT}`);
    });

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 ${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log('📴 Database connections closed. Process exiting.');
        process.exit(0);
      });
      // Force exit after 10s if connections don't close
      setTimeout(() => process.exit(1), 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to connect to MySQL database at startup:', error);
    process.exit(1);
  }
};

startServer();
