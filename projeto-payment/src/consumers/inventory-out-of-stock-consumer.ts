import { CloudEvent } from 'cloudevents';
import { EVENT_TYPES } from '../events/event-types.js';
import { PaymentService } from '../services/payment-service.js';
import { BaseConsumer } from './base-consumer.js';
import { buildPaymentRefundedEvent } from './refund-event.js';

interface InventoryOutOfStockData {
  orderId: number;
  unavailable_items: unknown[];
}

export class InventoryOutOfStockConsumer extends BaseConsumer<InventoryOutOfStockData> {
  readonly queueName = 'payment.inventory_out_of_stock';
  readonly exchangeName = EVENT_TYPES.INVENTORY_OUT_OF_STOCK;

  constructor(private readonly service: PaymentService) {
    super();
  }

  async handle(event: CloudEvent<InventoryOutOfStockData>): Promise<void> {
    const orderId = event.data!.orderId;
    console.log(`📨 [PAYMENT] Estoque indisponível para pedido #${orderId} — avaliando estorno`);

    const result = this.service.requestVoid(orderId, 'out_of_stock');

    if (result) {
      await this.publishEvent(EVENT_TYPES.PAYMENT_REFUNDED, buildPaymentRefundedEvent(result));
      console.log(`📤 [PAYMENT] Estorno publicado para pedido #${orderId}`);
    }
  }
}
