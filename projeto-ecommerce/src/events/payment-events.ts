import { CloudEvent } from 'cloudevents';
import { createEvent } from './base-event.js';
import { EVENT_SOURCES, EVENT_TYPES } from './event-types.js';

export interface PaymentApprovedData {
  orderId: number;
  paymentType: 'credit' | 'debit';
  amount: number;
  message: string;
}

export interface PaymentDeclinedData {
  orderId: number;
  paymentType: 'credit' | 'debit';
  amount: number;
  reason: string;
}

export function paymentApprovedEvent(
  orderId: number,
  paymentType: 'credit' | 'debit',
  amount: number,
  message: string,
): CloudEvent<PaymentApprovedData> {
  return createEvent<PaymentApprovedData>({
    type: EVENT_TYPES.PAYMENT_APPROVED,
    source: EVENT_SOURCES.PAYMENT_SERVICE,
    subject: `order-${orderId}`,
    data: { orderId, paymentType, amount, message },
  });
}

export function paymentDeclinedEvent(
  orderId: number,
  paymentType: 'credit' | 'debit',
  amount: number,
  reason: string,
): CloudEvent<PaymentDeclinedData> {
  return createEvent<PaymentDeclinedData>({
    type: EVENT_TYPES.PAYMENT_DECLINED,
    source: EVENT_SOURCES.PAYMENT_SERVICE,
    subject: `order-${orderId}`,
    data: { orderId, paymentType, amount, reason },
  });
}
