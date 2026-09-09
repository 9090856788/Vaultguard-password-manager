import express from 'express';
import cors from 'cors';
import apiRouter from './routes';
import { globalRateLimiter } from './middlewares/rateLimiter';
import { requestLogger } from './middlewares/logger';
import { errorHandler } from './middlewares/errorHandler';

export function createApiApp() {
  const app = express();

  // Basic Middlewares
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request Logging
  app.use(requestLogger);

  // Global Rate Limiter
  app.use(globalRateLimiter);

  // Mount API v1 router
  app.use('/v1', apiRouter);
  app.use('/', apiRouter); // Alias for direct /api/* routing

  // Global Error Handler
  app.use(errorHandler);

  return app;
}

export default createApiApp;
