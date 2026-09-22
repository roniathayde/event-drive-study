import { pool } from '../database/database.js';

export class InboxRepository {
  async register(eventId: string, eventType: string): Promise<boolean> {
    const result = await pool.query(
      `INSERT INTO inbox (event_id, event_type, processed_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (event_id) DO NOTHING`,
      [eventId, eventType, new Date().toISOString()]
    );
    return (result.rowCount ?? 0) === 1;
  }
}
