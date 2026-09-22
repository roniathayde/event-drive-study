export const EVENT_TYPES = {
  ORDER_CREATED: 'com.fake-ecommerce.order.created.v1',
  ORDER_COMPLETED: 'com.fake-ecommerce.order.completed.v1',
  ORDER_FAILED: 'com.fake-ecommerce.order.failed.v1',
  ORDER_CANCELLED: 'com.fake-ecommerce.order.cancelled.v1',
  ORDER_CANCELLATION_REQUESTED: 'com.fake-ecommerce.order.cancellation.requested.v1',
  PAYMENT_REQUESTED: 'com.fake-ecommerce.payment.requested.v1',
  PAYMENT_PROCESSED: 'com.fake-ecommerce.payment.processed.v1',
  PAYMENT_APPROVED: 'com.fake-ecommerce.payment.approved.v1',
  PAYMENT_DECLINED: 'com.fake-ecommerce.payment.declined.v1',
  PAYMENT_REFUNDED: 'com.fake-ecommerce.payment.refunded.v1',
  INVENTORY_RESERVED: 'com.fake-ecommerce.inventory.reserved.v1',
  INVENTORY_OUT_OF_STOCK: 'com.fake-ecommerce.inventory.out_of_stock.v1',
  INVENTORY_RELEASED: 'com.fake-ecommerce.inventory.released.v1',
} as const;

export const EVENT_SOURCES = {
  ORDER_SERVICE: '/ecommerce-service/orders',
  PAYMENT_SERVICE: '/payment-service/payments',
  INVENTORY_SERVICE: '/inventory-service',
  CREDIT_GATEWAY: '/payment-service/gateways/credit',
  DEBIT_GATEWAY: '/payment-service/gateways/debit',
} as const;
