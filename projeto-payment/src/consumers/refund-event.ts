import { CloudEvent } from 'cloudevents';
import { randomUUID } from 'crypto';
import { EVENT_SOURCES, EVENT_TYPES } from '../events/event-types.js';

export interface PaymentRefundedData {
  orderId: number;
  paymentRequestId: number;
  refundedAt: string;
}

export function buildPaymentRefundedEvent(result: {
  orderId: number;
  paymentRequestId: number;
  refundedAt: string;
}): CloudEvent<PaymentRefundedData> {
  return new CloudEvent<PaymentRefundedData>({
    id: randomUUID(),
    type: EVENT_TYPES.PAYMENT_REFUNDED,
    source: EVENT_SOURCES.PAYMENT_SERVICE,
    subject: `order-${result.orderId}`,
    time: new Date().toISOString(),
    datacontenttype: 'application/json',
    data: {
      orderId: result.orderId,
      paymentRequestId: result.paymentRequestId,
      refundedAt: result.refundedAt,
    },
  });
}
