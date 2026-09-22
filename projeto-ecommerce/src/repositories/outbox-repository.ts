import { CloudEvent } from 'cloudevents';
import { pool, Executor } from '../database/database.js';

export interface OutboxMessage {
  id: number;
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export class OutboxRepository {
  async save<T>(event: CloudEvent<T>, orderId: number, db: Executor = pool): Promise<void> {
    await db.query(
      `INSERT INTO outbox (event_id, event_type, order_id, payload)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (event_id) DO NOTHING`,
      [event.id, event.type, orderId, JSON.stringify(event)]
    );
  }

  async fetchUnpublished(db: Executor, limit: number): Promise<OutboxMessage[]> {
    const result = await db.query(
      `SELECT id, event_id, event_type, payload
         FROM outbox
        WHERE published_at IS NULL
        ORDER BY id
        FOR UPDATE SKIP LOCKED
        LIMIT $1`,
      [limit]
    );
    return result.rows.map((row) => ({
      id: Number(row.id),
      eventId: row.event_id,
      eventType: row.event_type,
      payload: row.payload,
    }));
  }

  async markPublished(id: number, db: Executor): Promise<void> {
    await db.query(
      `UPDATE outbox SET published_at = now(), attempts = attempts + 1 WHERE id = $1`,
      [id]
    );
  }

  async markFailed(id: number, error: string, db: Executor): Promise<void> {
    await db.query(
      `UPDATE outbox SET attempts = attempts + 1, last_error = $2 WHERE id = $1`,
      [id, error]
    );
  }
}
