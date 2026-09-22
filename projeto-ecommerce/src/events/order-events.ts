import { CloudEvent } from 'cloudevents';
import { createEvent } from './base-event.js';
import { EVENT_SOURCES, EVENT_TYPES } from './event-types.js';

export interface OrderCreatedData {
  orderId: number;
  customerName: string;
  totalAmount: number;
  items: Array<{
    product_name: string;
    quantity: number;
    price: number;
  }>;
  payment: {
    card_number: string;
    payment_type: 'credit' | 'debit';
  };
}

export interface OrderCompletedData {
  orderId: number;
  status: 'paid';
}

export interface OrderFailedData {
  orderId: number;
  status: 'failed';
  reason: string;
}

export interface OrderCancelledData {
  orderId: number;
  status: 'cancelled';
}

export interface OrderCancellationRequestedData {
  orderId: number;
}

export function orderCreatedEvent(
  orderId: number,
  customerName: string,
  totalAmount: number,
  items: OrderCreatedData['items'],
  payment: OrderCreatedData['payment'],
): CloudEvent<OrderCreatedData> {
  return createEvent<OrderCreatedData>({
    type: EVENT_TYPES.ORDER_CREATED,
    source: EVENT_SOURCES.ORDER_SERVICE,
    subject: `order-${orderId}`,
    data: { orderId, customerName, totalAmount, items, payment },
  });
}

export function orderCompletedEvent(orderId: number): CloudEvent<OrderCompletedData> {
  return createEvent<OrderCompletedData>({
    type: EVENT_TYPES.ORDER_COMPLETED,
    source: EVENT_SOURCES.ORDER_SERVICE,
    subject: `order-${orderId}`,
    data: { orderId, status: 'paid' },
  });
}

export function orderFailedEvent(orderId: number, reason: string): CloudEvent<OrderFailedData> {
  return createEvent<OrderFailedData>({
    type: EVENT_TYPES.ORDER_FAILED,
    source: EVENT_SOURCES.ORDER_SERVICE,
    subject: `order-${orderId}`,
    data: { orderId, status: 'failed', reason },
  });
}

export function orderCancelledEvent(orderId: number): CloudEvent<OrderCancelledData> {
  return createEvent<OrderCancelledData>({
    type: EVENT_TYPES.ORDER_CANCELLED,
    source: EVENT_SOURCES.ORDER_SERVICE,
    subject: `order-${orderId}`,
    data: { orderId, status: 'cancelled' },
  });
}

export function orderCancellationRequestedEvent(orderId: number): CloudEvent<OrderCancellationRequestedData> {
  return createEvent<OrderCancellationRequestedData>({
    type: EVENT_TYPES.ORDER_CANCELLATION_REQUESTED,
    source: EVENT_SOURCES.ORDER_SERVICE,
    subject: `order-${orderId}`,
    data: { orderId },
  });
}
