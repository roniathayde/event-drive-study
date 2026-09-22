import { CloudEvent } from 'cloudevents';
import { randomUUID } from 'crypto';
import { EVENT_SOURCES, EVENT_TYPES } from '../events/event-types.js';
import { PaymentService } from '../services/payment-service.js';
import { BaseConsumer } from './base-consumer.js';

interface OrderCreatedData {
  orderId: number;
  customerName: string;
  totalAmount: number;
  items: Array<{ product_name: string; quantity: number; price: number }>;
  payment: {
    card_number: string;
    payment_type: 'credit' | 'debit';
  };
}

interface PaymentRequestedData {
  paymentRequestId: number;
  externalId: number;
  amount: number;
  paymentMethod: string;
  cardNumber: string;
}

export class OrderCreatedConsumer extends BaseConsumer<OrderCreatedData> {
  readonly queueName = 'payment.process_order';
  readonly exchangeName = EVENT_TYPES.ORDER_CREATED;

  constructor(private readonly service: PaymentService) {
    super();
  }

  async handle(event: CloudEvent<OrderCreatedData>): Promise<void> {
    const { orderId, totalAmount, payment } = event.data!;

    const result = await this.service.processPayment(
      orderId,
      totalAmount,
      payment.payment_type,
      payment.card_number
    );

    const routingKey = payment.payment_type === 'credit' ? 'credit' : 'debit';

    const paymentRequestedEvent = new CloudEvent<PaymentRequestedData>({
      id: randomUUID(),
      type: EVENT_TYPES.PAYMENT_REQUESTED,
      source: EVENT_SOURCES.PAYMENT_SERVICE,
      subject: `order-${orderId}`,
      time: new Date().toISOString(),
      datacontenttype: 'application/json',
      data: {
        paymentRequestId: result.paymentId,
        externalId: result.externalId,
        amount: result.amount,
        paymentMethod: result.paymentMethod,
        cardNumber: result.cardNumber,
      },
    });

    await this.publishEvent(EVENT_TYPES.PAYMENT_REQUESTED, paymentRequestedEvent, routingKey, 'topic');
    console.log(`📤 [PAYMENT] Requisição enviada para gateway ${routingKey.toUpperCase()}`);
  }
}
