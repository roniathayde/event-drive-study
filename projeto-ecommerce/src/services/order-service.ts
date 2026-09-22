import { OrderRepository } from '../repositories/order-repository.js';
import { OutboxRepository } from '../repositories/outbox-repository.js';
import { Order } from '../models/order.js';
import { orderCreatedEvent } from '../events/order-events.js';
import { withTransaction } from '../database/database.js';
import { OrderSagaService } from './order-saga-service.js';

export interface CreateOrderRequest {
  customer_name: string;
  items: Array<{
    product_name: string;
    quantity: number;
    price: number;
  }>;
  payment: {
    card_number: string;
    payment_type: 'credit' | 'debit';
  };
}

export class OrderService {
  private orderRepository = new OrderRepository();
  private outboxRepository = new OutboxRepository();
  private sagaService = new OrderSagaService();

  async createOrder(request: CreateOrderRequest): Promise<{ order_id: number; status: string }> {
    if (!request.customer_name || !request.items || !request.payment) {
      throw new Error('Dados inválidos');
    }

    if (request.items.length === 0) {
      throw new Error('Pedido deve conter pelo menos um item');
    }

    const total_amount = request.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    if (total_amount <= 0) {
      throw new Error('Valor total do pedido deve ser maior que zero');
    }

    console.log(`\n📦 Criando pedido para ${request.customer_name}...`);

    const order: Order = {
      customer_name: request.customer_name,
      total_amount,
      status: 'pending_payment',
      created_at: new Date().toISOString(),
    };

    const orderId = await withTransaction(async (tx) => {
      const id = await this.orderRepository.create(order, tx);
      await this.sagaService.initSaga(id, tx);
      await this.outboxRepository.save(
        orderCreatedEvent(id, request.customer_name, total_amount, request.items, request.payment),
        id,
        tx
      );
      return id;
    });

    console.log(`✓ Pedido #${orderId} criado (evento na outbox)`);

    return { order_id: orderId, status: 'pending_payment' };
  }

  async confirmPayment(orderId: number): Promise<void> {
    await this.sagaService.onPaymentApproved(orderId);
  }

  async declinePayment(orderId: number, reason: string): Promise<void> {
    await this.sagaService.onPaymentDeclined(orderId, reason);
  }

  async onInventoryReserved(orderId: number): Promise<void> {
    await this.sagaService.onInventoryReserved(orderId);
  }

  async onInventoryOutOfStock(orderId: number): Promise<void> {
    await this.sagaService.onInventoryOutOfStock(orderId);
  }

  async onPaymentRefunded(orderId: number): Promise<void> {
    await this.sagaService.onPaymentRefunded(orderId);
  }

  async onInventoryReleased(orderId: number): Promise<void> {
    await this.sagaService.onInventoryReleased(orderId);
  }

  async getOrderStatus(orderId: number) {
    return this.sagaService.getOrderStatus(orderId);
  }

  async listOrders() {
    return this.sagaService.listOrders();
  }

  async cancelOrder(orderId: number): Promise<void> {
    await this.sagaService.cancelOrder(orderId);
  }

  async isDuplicateEvent(eventId: string, eventType: string): Promise<boolean> {
    return this.sagaService.isDuplicateEvent(eventId, eventType);
  }
}
