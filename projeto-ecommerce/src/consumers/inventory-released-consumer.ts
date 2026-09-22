import { CloudEvent } from 'cloudevents';
import { OrderService } from '../services/order-service.js';
import { EVENT_TYPES } from '../events/event-types.js';
import { BaseConsumer } from './base-consumer.js';

interface InventoryReleasedData {
  orderId: number;
}

export class InventoryReleasedConsumer extends BaseConsumer<InventoryReleasedData> {
  readonly queueName = 'ecommerce.inventory_released';
  readonly exchangeName = EVENT_TYPES.INVENTORY_RELEASED;
  private orderService = new OrderService();

  async handle(event: CloudEvent<InventoryReleasedData>): Promise<void> {
    if (await this.orderService.isDuplicateEvent(event.id!, event.type!)) {
      console.log(`↩️ Evento duplicado ignorado [${event.id}]`);
      return;
    }

    const orderId = event.data!.orderId;
    console.log(`📦 Estoque devolvido para pedido #${orderId}`);
    await this.orderService.onInventoryReleased(orderId);
  }
}
