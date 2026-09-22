import { Router, Request, Response } from 'express';

const router = Router();

// Health check endpoint para verificar se a aplicação está rodando
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ecommerce-api'
  });
});

export { router as healthRoutes };
