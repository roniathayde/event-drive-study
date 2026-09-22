import express from 'express';
import cors from 'cors';
import { join } from 'path';
import { orderRoutes } from './routes/orders.js';
import { healthRoutes } from './routes/health.js';
import { createTables } from './database/database.js';

export const createApp = async (): Promise<express.Application> => {
  await createTables();

  const app = express();

  app.use(cors());

  app.use(express.json());

  app.use(express.static(join(process.cwd(), 'public')));

  // Rotas
  app.use('/health', healthRoutes);
  app.use('/api/orders', orderRoutes);

  return app;
};
