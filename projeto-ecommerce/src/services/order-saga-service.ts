import { OrderRepository } from '../repositories/order-repository.js';
import { OrderSagaRepository } from '../repositories/order-saga-repository.js';
import { InboxRepository } from '../repositories/inbox-repository.js';
import { OutboxRepository } from '../repositories/outbox-repository.js';
import { Executor, withTransaction } from '../database/database.js';
import {
  orderCancellationRequestedEvent,
  orderCancelledEvent,
  orderCompletedEvent,
  orderFailedEvent,
} from '../events/order-events.js';
import { OrderSaga, OrderStatus, SagaStatus } from '../models/order.js';

const IMMUTABLE_SAGA_STATUSES = new Set<SagaStatus>(['COMPLETED', 'FAILED', 'CANCELLED']);

export class OrderSagaService {
  private orderRepository = new OrderRepository();
  private sagaRepository = new OrderSagaRepository();
  private inboxRepository = new InboxRepository();
  private outboxRepository = new OutboxRepository();

  async initSaga(orderId: number, db?: Executor): Promise<void> {
    await this.sagaRepository.create(orderId, db);
  }

  async isDuplicateEvent(eventId: string, eventType: string): Promise<boolean> {
    return !(await this.inboxRepository.register(eventId, eventType));
  }

  async onInventoryReserved(orderId: number): Promise<void> {
    const saga = await this.getSagaOrThrow(orderId);
    if (saga.inventory_state !== 'PENDING') return;
    await this.sagaRepository.updateInventoryState(orderId, 'RESERVED');
    await this.project(orderId);
  }

  async onInventoryOutOfStock(orderId: number): Promise<void> {
    const saga = await this.getSagaOrThrow(orderId);
    if (saga.inventory_state !== 'PENDING') return;
    await this.sagaRepository.updateInventoryState(orderId, 'OUT_OF_STOCK');
    await this.project(orderId);
  }

  async onPaymentApproved(orderId: number): Promise<void> {
    const saga = await this.getSagaOrThrow(orderId);
    if (saga.payment_state !== 'PENDING') return;
    await this.sagaRepository.updatePaymentState(orderId, 'APPROVED');
    await this.project(orderId);
  }

  async onPaymentDeclined(orderId: number, reason: string): Promise<void> {
    const saga = await this.getSagaOrThrow(orderId);
    if (saga.payment_state !== 'PENDING') return;
    await this.sagaRepository.updatePaymentState(orderId, 'DECLINED');
    await this.project(orderId, reason);
  }

  async onPaymentRefunded(orderId: number): Promise<void> {
    const saga = await this.getSagaOrThrow(orderId);
    if (saga.payment_state === 'REFUNDED') return;
    await this.sagaRepository.updatePaymentState(orderId, 'REFUNDED');
    await this.project(orderId);
  }

  async onInventoryReleased(orderId: number): Promise<void> {
    const saga = await this.getSagaOrThrow(orderId);
    if (saga.inventory_state === 'RELEASED') return;
    await this.sagaRepository.updateInventoryState(orderId, 'RELEASED');
    await this.project(orderId);
  }

  async cancelOrder(orderId: number): Promise<void> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new Error('Pedido não encontrado');
    }

    const saga = await this.getSagaOrThrow(orderId);
    if (IMMUTABLE_SAGA_STATUSES.has(saga.saga_status)) {
      throw new Error(`Pedido já está em estado terminal: ${saga.saga_status}`);
    }

    await withTransaction(async (tx) => {
      await this.sagaRepository.markCancelRequested(orderId, tx);
      await this.sagaRepository.updateSagaStatus(orderId, 'COMPENSATING', tx);
      await this.orderRepository.updateStatus(orderId, 'compensating', tx);
      await this.outboxRepository.save(orderCancellationRequestedEvent(orderId), orderId, tx);
    });
    console.log(`🚫 Pedido #${orderId}: cancelamento solicitado (evento na outbox)`);
  }

  async getOrderStatus(orderId: number) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new Error('Pedido não encontrado');
    }

    const saga = await this.sagaRepository.findByOrderId(orderId);

    return {
      order_id: order.id,
      customer_name: order.customer_name,
      total_amount: order.total_amount,
      status: order.status,
      created_at: order.created_at,
      saga: saga ?? null,
    };
  }

  async listOrders() {
    const orders = await this.orderRepository.findAll();
    return Promise.all(
      orders.map(async (order) => {
        const saga = await this.sagaRepository.findByOrderId(order.id!);
        return {
          order_id: order.id,
          customer_name: order.customer_name,
          total_amount: order.total_amount,
          status: order.status,
          created_at: order.created_at,
          saga: saga ?? null,
        };
      })
    );
  }

  private async project(orderId: number, failureReason?: string): Promise<void> {
    const saga = await this.getSagaOrThrow(orderId);

    if (IMMUTABLE_SAGA_STATUSES.has(saga.saga_status)) {
      return;
    }

    const { payment_state, inventory_state, cancel_requested } = saga;

    if (cancel_requested) {
      await this.projectCancellation(orderId, saga);
      return;
    }

    if (payment_state === 'PENDING' || inventory_state === 'PENDING') {
      await this.setStatus(orderId, 'RUNNING', 'processing');
      return;
    }

    if (payment_state === 'APPROVED' && inventory_state === 'RESERVED') {
      await this.complete(orderId);
      return;
    }

    if (payment_state === 'DECLINED' && inventory_state === 'OUT_OF_STOCK') {
      await this.fail(orderId, failureReason ?? 'Pagamento recusado e estoque indisponível');
      return;
    }

    if (inventory_state === 'OUT_OF_STOCK' && payment_state === 'APPROVED') {
      await this.setStatus(orderId, 'COMPENSATING', 'compensating');
      return;
    }
    if (inventory_state === 'OUT_OF_STOCK' && payment_state === 'REFUNDED') {
      await this.fail(orderId, failureReason ?? 'Estoque indisponível após pagamento aprovado');
      return;
    }

    if (payment_state === 'DECLINED' && inventory_state === 'RESERVED') {
      await this.setStatus(orderId, 'COMPENSATING', 'compensating');
      return;
    }
    if (payment_state === 'DECLINED' && inventory_state === 'RELEASED') {
      await this.fail(orderId, failureReason ?? 'Pagamento recusado após reserva de estoque');
    }
  }

  private async projectCancellation(orderId: number, saga: OrderSaga): Promise<void> {
    const paymentResolved =
      saga.payment_state === 'REFUNDED' ||
      saga.payment_state === 'DECLINED' ||
      saga.payment_state === 'PENDING';
    const inventoryResolved =
      saga.inventory_state === 'RELEASED' ||
      saga.inventory_state === 'OUT_OF_STOCK' ||
      saga.inventory_state === 'PENDING';

    if (paymentResolved && inventoryResolved) {
      await this.cancel(orderId);
    } else {
      await this.setStatus(orderId, 'COMPENSATING', 'compensating');
    }
  }

  private async setStatus(
    orderId: number,
    sagaStatus: SagaStatus,
    orderStatus: OrderStatus,
    db?: Executor
  ): Promise<void> {
    await this.sagaRepository.updateSagaStatus(orderId, sagaStatus, db);
    await this.orderRepository.updateStatus(orderId, orderStatus, db);
  }

  private async complete(orderId: number): Promise<void> {
    await withTransaction(async (tx) => {
      await this.setStatus(orderId, 'COMPLETED', 'completed', tx);
      await this.outboxRepository.save(orderCompletedEvent(orderId), orderId, tx);
    });
    console.log(`✅ Saga #${orderId}: pedido concluído`);
  }

  private async fail(orderId: number, reason: string): Promise<void> {
    await withTransaction(async (tx) => {
      await this.setStatus(orderId, 'FAILED', 'failed', tx);
      await this.outboxRepository.save(orderFailedEvent(orderId, reason), orderId, tx);
    });
    console.log(`❌ Saga #${orderId}: pedido falhou: ${reason}`);
  }

  private async cancel(orderId: number): Promise<void> {
    await withTransaction(async (tx) => {
      await this.setStatus(orderId, 'CANCELLED', 'cancelled', tx);
      await this.outboxRepository.save(orderCancelledEvent(orderId), orderId, tx);
    });
    console.log(`🚫 Saga #${orderId}: pedido cancelado`);
  }

  private async getSagaOrThrow(orderId: number): Promise<OrderSaga> {
    const saga = await this.sagaRepository.findByOrderId(orderId);
    if (!saga) {
      throw new Error(`Saga não encontrada para pedido #${orderId}`);
    }
    return saga;
  }
}
