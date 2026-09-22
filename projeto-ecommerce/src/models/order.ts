export type OrderStatus =
  | 'pending'
  | 'pending_payment'
  | 'processing'
  | 'completed'
  | 'compensating'
  | 'failed'
  | 'cancelled';

export interface Order {
  id?: number;
  customer_name: string;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
}

export interface OrderItem {
  product_name: string;
  quantity: number;
  price: number;
}

export type PaymentLegState = 'PENDING' | 'APPROVED' | 'DECLINED' | 'REFUNDED';
export type InventoryLegState = 'PENDING' | 'RESERVED' | 'OUT_OF_STOCK' | 'RELEASED';
export type SagaStatus = 'RUNNING' | 'COMPLETED' | 'COMPENSATING' | 'FAILED' | 'CANCELLED';

export interface OrderSaga {
  order_id: number;
  payment_state: PaymentLegState;
  inventory_state: InventoryLegState;
  saga_status: SagaStatus;
  cancel_requested: boolean;
  updated_at: string;
}
