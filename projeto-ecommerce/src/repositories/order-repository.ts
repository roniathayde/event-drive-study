import { pool, Executor } from '../database/database.js';
import { Order } from '../models/order.js';

export class OrderRepository {
  async create(order: Order, db: Executor = pool): Promise<number> {
    const result = await db.query(
      `INSERT INTO orders (customer_name, total_amount, status, created_at)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [order.customer_name, order.total_amount, order.status, order.created_at]
    );
    return Number(result.rows[0].id);
  }

  async updateStatus(orderId: number, status: string, db: Executor = pool): Promise<void> {
    await db.query('UPDATE orders SET status = $1 WHERE id = $2', [status, orderId]);
  }

  async findById(orderId: number): Promise<Order | undefined> {
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const row = result.rows[0];
    if (!row) return undefined;
    return { ...row, id: Number(row.id) };
  }

  async findAll(): Promise<Order[]> {
    const result = await pool.query('SELECT * FROM orders ORDER BY id DESC');
    return result.rows.map((row) => ({ ...row, id: Number(row.id) }));
  }
}
