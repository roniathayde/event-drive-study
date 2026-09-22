import Database, { Database as SQLiteDatabase } from 'better-sqlite3';
import { join } from 'path';

const db: SQLiteDatabase = new Database(join(process.cwd(), 'pagamento.db'));

const createTables = (): void => {
  db.exec(`
  CREATE TABLE IF NOT EXISTS payment_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL,
    card_number TEXT,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    processed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS payment_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_request_id INTEGER NOT NULL,
    transaction_type TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL,
    response_data TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (payment_request_id) REFERENCES payment_requests(id)
  );

  -- Intenção de estorno/void registrada quando um evento de compensação
  -- (out_of_stock ou cancelamento) chega ANTES de o pagamento ser aprovado.
  -- Resolve a corrida de timing típica da coreografia.
  CREATE TABLE IF NOT EXISTS void_intents (
    external_id TEXT PRIMARY KEY,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);
}

export { db, createTables };
