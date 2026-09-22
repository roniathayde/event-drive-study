export interface AuditLog {
  id?: number;
  event_type: string;
  entity_type: string; // Ex: 'Order', 'Payment'
  entity_id: string;
  action: string; // Ex: 'created', 'updated', 'cancelled'
  data: string; // JSON string dos dados do evento
  occurred_at: string;
}
