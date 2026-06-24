import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import apiRouter from './routes/api';
import { errorHandler } from './middleware/error.middleware';
import { prisma } from './utils/prisma';

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet());

// Serve static uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// CORS configuration supporting cookies and headers
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: allowedOrigin,
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

// Basic route fallback for unmatched endpoints
app.use('*', (req, res, _next) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server.`,
  });
});

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
