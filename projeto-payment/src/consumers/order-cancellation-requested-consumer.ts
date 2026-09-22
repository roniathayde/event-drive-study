import { CloudEvent } from 'cloudevents';
import { EVENT_TYPES } from '../events/event-types.js';
import { PaymentService } from '../services/payment-service.js';
import { BaseConsumer } from './base-consumer.js';
import { buildPaymentRefundedEvent } from './refund-event.js';

interface OrderCancellationRequestedData {
  orderId: number;
}

export class OrderCancellationRequestedConsumer extends BaseConsumer<OrderCancellationRequestedData> {
  readonly queueName = 'payment.order_cancellation';
  readonly exchangeName = EVENT_TYPES.ORDER_CANCELLATION_REQUESTED;

  constructor(private readonly service: PaymentService) {
    super();
  }

  async handle(event: CloudEvent<OrderCancellationRequestedData>): Promise<void> {
    const orderId = event.data!.orderId;
    console.log(`📨 [PAYMENT] Cancelamento solicitado para pedido #${orderId} — avaliando estorno`);

    const result = this.service.requestVoid(orderId, 'cancelled');

    if (result) {
      await this.publishEvent(EVENT_TYPES.PAYMENT_REFUNDED, buildPaymentRefundedEvent(result));
      console.log(`📤 [PAYMENT] Estorno publicado para pedido #${orderId}`);
    }
  }
}
