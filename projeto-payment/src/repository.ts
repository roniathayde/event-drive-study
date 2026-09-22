import { db } from './database/database.js';

export class PaymentRepository {
  createPaymentRequest(externalId: number, amount: number, paymentMethod: string, cardNumber?: string) {
    const stmt = db.prepare(`
      INSERT INTO payment_requests (external_id, amount, payment_method, card_number, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      externalId,
      amount,
      paymentMethod,
      cardNumber || null,
      'processing',
      new Date().toISOString()
    );

    return Number(result.lastInsertRowid);
  }

  createTransaction(
    paymentId: number,
    amount: number,
    status: string,
    responseData: string,
    transactionType: string = 'authorization'
  ) {
    const stmt = db.prepare(`
      INSERT INTO payment_transactions (payment_request_id, transaction_type, amount, status, response_data, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      paymentId,
      transactionType,
      amount,
      status,
      responseData,
      new Date().toISOString()
    );
  }

  updatePaymentStatus(paymentId: number, status: string, processedAt: string) {
    const stmt = db.prepare(`
      UPDATE payment_requests SET status = ?, processed_at = ? WHERE id = ?
    `);
    stmt.run(status, processedAt, paymentId);
  }

  findApprovedByExternalId(externalId: number) {
    const stmt = db.prepare(`
      SELECT * FROM payment_requests
      WHERE external_id = ? AND status = 'approved'
      ORDER BY id DESC LIMIT 1
    `);
    return stmt.get(externalId) as {
      id: number;
      external_id: number;
      amount: number;
      status: string;
    } | undefined;
  }

  markRefunded(paymentId: number, processedAt: string): number {
    const stmt = db.prepare(`
      UPDATE payment_requests SET status = 'refunded', processed_at = ?
      WHERE id = ? AND status = 'approved'
    `);
    const result = stmt.run(processedAt, paymentId);
    return result.changes;
  }

  addVoidIntent(externalId: number, reason: string): void {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO void_intents (external_id, reason, created_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(externalId, reason, new Date().toISOString());
  }

  hasVoidIntent(externalId: number): boolean {
    const stmt = db.prepare('SELECT 1 FROM void_intents WHERE external_id = ?');
    return stmt.get(externalId) !== undefined;
  }
}
