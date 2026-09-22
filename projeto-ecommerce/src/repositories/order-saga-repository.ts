import { pool, Executor } from '../database/database.js';
import { InventoryLegState, OrderSaga, PaymentLegState, SagaStatus } from '../models/order.js';

export class OrderSagaRepository {
  async create(orderId: number, db: Executor = pool): Promise<void> {
    await db.query(
      `INSERT INTO order_saga (order_id, payment_state, inventory_state, saga_status, cancel_requested, updated_at)
       VALUES ($1, 'PENDING', 'PENDING', 'RUNNING', FALSE, $2)`,
      [orderId, new Date().toISOString()]
    );
  }

  async findByOrderId(orderId: number): Promise<OrderSaga | undefined> {
    const result = await pool.query('SELECT * FROM order_saga WHERE order_id = $1', [orderId]);
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return this.mapRow(row);
  }

  async updatePaymentState(
    orderId: number,
    paymentState: PaymentLegState,
    db: Executor = pool
  ): Promise<void> {
    await db.query(
      `UPDATE order_saga SET payment_state = $1, updated_at = $2 WHERE order_id = $3`,
      [paymentState, new Date().toISOString(), orderId]
    );
  }

  async updateInventoryState(
    orderId: number,
    inventoryState: InventoryLegState,
    db: Executor = pool
  ): Promise<void> {
    await db.query(
      `UPDATE order_saga SET inventory_state = $1, updated_at = $2 WHERE order_id = $3`,
      [inventoryState, new Date().toISOString(), orderId]
    );
  }

  async updateSagaStatus(
    orderId: number,
    sagaStatus: SagaStatus,
    db: Executor = pool
  ): Promise<void> {
    await db.query(
      `UPDATE order_saga SET saga_status = $1, updated_at = $2 WHERE order_id = $3`,
      [sagaStatus, new Date().toISOString(), orderId]
    );
  }

  async markCancelRequested(orderId: number, db: Executor = pool): Promise<void> {
    await db.query(
      `UPDATE order_saga SET cancel_requested = TRUE, updated_at = $1 WHERE order_id = $2`,
      [new Date().toISOString(), orderId]
    );
  }

  private mapRow(row: Record<string, unknown>): OrderSaga {
    return {
      order_id: Number(row.order_id),
      payment_state: row.payment_state as PaymentLegState,
      inventory_state: row.inventory_state as InventoryLegState,
      saga_status: row.saga_status as SagaStatus,
      cancel_requested: Boolean(row.cancel_requested),
      updated_at: row.updated_at as string,
    };
  }
}
