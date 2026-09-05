import express, { Express } from 'express';
import cors from 'cors';
import { apiRouter } from './routes.js';

export function createExpressApp(): Express {
  const app = express();

  // Middlewares
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Cloud Media Files Storage Service API',
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API router
  app.use('/api', apiRouter);

  return app;
}
