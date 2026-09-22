import { Request, Response } from 'express';
import { OrderService } from '../services/order-service.js';

export class OrderController {
  private orderService = new OrderService();

  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.orderService.createOrder(req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error(`\n❌ Erro: ${(error as Error).message}\n`);
      res.status(400).json({
        error: (error as Error).message,
      });
    }
  }

  async listOrders(_req: Request, res: Response): Promise<void> {
    try {
      const orders = await this.orderService.listOrders();
      res.status(200).json(orders);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async getOrder(req: Request, res: Response): Promise<void> {
    try {
      const orderId = Number(req.params.id);
      if (Number.isNaN(orderId)) {
        res.status(400).json({ error: 'ID do pedido inválido' });
        return;
      }

      const result = await this.orderService.getOrderStatus(orderId);
      res.status(200).json(result);
    } catch (error) {
      const message = (error as Error).message;
      const status = message.includes('não encontrado') ? 404 : 400;
      res.status(status).json({ error: message });
    }
  }

  async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      const orderId = Number(req.params.id);
      if (Number.isNaN(orderId)) {
        res.status(400).json({ error: 'ID do pedido inválido' });
        return;
      }

      await this.orderService.cancelOrder(orderId);
      const result = await this.orderService.getOrderStatus(orderId);
      res.status(200).json(result);
    } catch (error) {
      const message = (error as Error).message;
      const status = message.includes('não encontrado') ? 404 : 400;
      res.status(status).json({ error: message });
    }
  }
}
