import { pool } from '../database/database.js';
import { AuditLog } from '../models/audit-log.js';

export class AuditLogRepository {
  async create(auditLog: AuditLog): Promise<number> {
    const result = await pool.query(
      `INSERT INTO audit_logs (event_type, entity_type, entity_id, action, data, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        auditLog.event_type,
        auditLog.entity_type,
        auditLog.entity_id,
        auditLog.action,
        auditLog.data,
        auditLog.occurred_at,
      ]
    );
    return Number(result.rows[0].id);
  }
}
