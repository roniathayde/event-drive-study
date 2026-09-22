import Database from 'better-sqlite3';

const db = new Database('auditoria.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS eventos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    event_source TEXT NOT NULL,
    event_subject TEXT,
    spec_version TEXT NOT NULL,
    data_content_type TEXT,
    data TEXT NOT NULL,
    event_time TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log('✅ Banco de dados inicializado');

export function saveEvent(event) {
  const stmt = db.prepare(`
    INSERT INTO eventos (
      event_id, event_type, event_source, event_subject,
      spec_version, data_content_type, data, event_time
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    stmt.run(
      event.id,
      event.type,
      event.source,
      event.subject ?? null,
      event.specversion,
      event.datacontenttype ?? null,
      JSON.stringify(event.data),
      event.time
    );
    console.log(`💾 Evento salvo: ${event.type} [${event.id}]`);
    return true;
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      console.log(`⚠️  Evento já existe: ${event.id}`);
    } else {
      console.error('❌ Erro ao salvar evento:', error);
    }
    return false;
  }
}

export default db;
