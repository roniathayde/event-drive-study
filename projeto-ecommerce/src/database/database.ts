import pg from 'pg';
import { CONFIG } from '../config/constants.js';

const { Pool, Client } = pg;

const pool = new Pool({ connectionString: CONFIG.DATABASE_URL });

export type Executor = Pick<pg.PoolClient, 'query'>;

function adminConnectionString(): string {
  const url = new URL(CONFIG.DATABASE_URL);
  url.pathname = '/postgres';
  return url.toString();
}

function targetDatabaseName(): string {
  return new URL(CONFIG.DATABASE_URL).pathname.replace(/^\//, '');
}

async function ensureDatabase(): Promise<void> {
  const databaseName = targetDatabaseName();
  const client = new Client({ connectionString: adminConnectionString() });
  await client.connect();
  const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
  if ((result.rowCount ?? 0) === 0) {
    await client.query(`CREATE DATABASE ${databaseName}`);
    console.log(`Banco de dados "${databaseName}" criado.`);
  }
  await client.end();
}

const createTables = async (): Promise<void> => {
  await ensureDatabase();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGSERIAL PRIMARY KEY,
      customer_name TEXT NOT NULL,
      total_amount DOUBLE PRECISION NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_saga (
      order_id BIGINT PRIMARY KEY REFERENCES orders(id),
      payment_state TEXT NOT NULL DEFAULT 'PENDING',
      inventory_state TEXT NOT NULL DEFAULT 'PENDING',
      saga_status TEXT NOT NULL DEFAULT 'RUNNING',
      cancel_requested BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inbox (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      processed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outbox (
      id BIGSERIAL PRIMARY KEY,
      event_id TEXT NOT NULL UNIQUE,
      event_type TEXT NOT NULL,
      order_id BIGINT NOT NULL REFERENCES orders(id),
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      published_at TIMESTAMPTZ,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_outbox_unpublished
      ON outbox (id) WHERE published_at IS NULL;
  `);
};

async function withTransaction<T>(fn: (tx: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export { pool, createTables, withTransaction };
