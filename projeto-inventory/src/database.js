import Database from 'better-sqlite3';

const db = new Database('inventory.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT NOT NULL UNIQUE,
    quantity INTEGER NOT NULL,
    updated_at TEXT NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS inbox (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    processed_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'reserved',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS release_intents (
    order_id INTEGER PRIMARY KEY,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

const count = db.prepare('SELECT COUNT(*) as c FROM inventory').get().c;
if (count === 0) {
  const insert = db.prepare(
    'INSERT INTO inventory (product_name, quantity, updated_at) VALUES (?, ?, ?)'
  );
  const now = new Date().toISOString();
  insert.run('Notebook', 100_000_000, now);
  insert.run('Mouse', 100_000_000, now);
  insert.run('Teclado', 100_000_000, now);
  console.log('✓ Estoque inicial criado');
}

console.log('✅ Banco de dados inicializado');

export default db;
