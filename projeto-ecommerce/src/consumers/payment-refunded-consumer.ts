import { CloudEvent } from 'cloudevents';
import { OrderService } from '../services/order-service.js';
import { EVENT_TYPES } from '../events/event-types.js';
import { BaseConsumer } from './base-consumer.js';

interface PaymentRefundedData {
  orderId: number;
  paymentRequestId: number;
  refundedAt: string;
}

export class PaymentRefundedConsumer extends BaseConsumer<PaymentRefundedData> {
  readonly queueName = 'ecommerce.payment_refunded';
  readonly exchangeName = EVENT_TYPES.PAYMENT_REFUNDED;
  private orderService = new OrderService();

  async handle(event: CloudEvent<PaymentRefundedData>): Promise<void> {
    if (await this.orderService.isDuplicateEvent(event.id!, event.type!)) {
      console.log(`↩️ Evento duplicado ignorado [${event.id}]`);
      return;
    }

    const orderId = event.data!.orderId;
    console.log(`💳 Pagamento estornado para pedido #${orderId}`);
    await this.orderService.onPaymentRefunded(orderId);
  }
}
