import { CloudEvent } from 'cloudevents';
import { OrderService } from '../services/order-service.js';
import { EVENT_TYPES } from '../events/event-types.js';
import { BaseConsumer } from './base-consumer.js';

interface InventoryReservedData {
  orderId: number;
  reserved_items: Array<{
    productName: string;
    quantityReserved: number;
    remainingStock: number;
  }>;
}

export class InventoryReservedConsumer extends BaseConsumer<InventoryReservedData> {
  readonly queueName = 'ecommerce.inventory_reserved';
  readonly exchangeName = EVENT_TYPES.INVENTORY_RESERVED;
  private orderService = new OrderService();

  async handle(event: CloudEvent<InventoryReservedData>): Promise<void> {
    if (await this.orderService.isDuplicateEvent(event.id!, event.type!)) {
      console.log(`↩️ Evento duplicado ignorado [${event.id}]`);
      return;
    }

    const orderId = event.data!.orderId;
    console.log(`📦 Estoque reservado para pedido #${orderId}`);
    await this.orderService.onInventoryReserved(orderId);
  }
}
