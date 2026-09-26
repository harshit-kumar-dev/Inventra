import express, { Request, Response } from 'express';
import cors from 'cors';
import { prisma } from './config/db';
import { ENV } from './config/env';
import apiRouter from './routes';
import { errorHandler } from './middleware/error.middleware';

export const app = express();

app.use(
  cors({
    origin: ENV.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());

// Health Check Endpoint
app.get('/api/health', async (_req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = `error: ${error instanceof Error ? error.message : 'unknown'}`;
  }

  res.status(dbStatus === 'connected' ? 200 : 500).json({
    status: 'ok',
    service: 'StockSense API',
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
});

// Mount Main API Routes
app.use('/api', apiRouter);

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
