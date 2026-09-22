import db from './database.js';

const insertEvent = db.prepare(
    'INSERT OR IGNORE INTO inbox (event_id, event_type, processed_at) VALUES (?, ?, ?)'
);

export function registerInboxEvent(eventId, eventType) {
    const { changes } = insertEvent.run(eventId, eventType, new Date().toISOString());
    return changes === 1;
}