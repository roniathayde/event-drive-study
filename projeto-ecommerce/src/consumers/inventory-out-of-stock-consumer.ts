import { CloudEvent } from 'cloudevents';
import { OrderService } from '../services/order-service.js';
import { EVENT_TYPES } from '../events/event-types.js';
import { BaseConsumer } from './base-consumer.js';

interface InventoryOutOfStockData {
  orderId: number;
  unavailable_items: Array<{
    productName: string;
    available: number;
    requested: number;
    reason: string;
  }>;
}

export class InventoryOutOfStockConsumer extends BaseConsumer<InventoryOutOfStockData> {
  readonly queueName = 'ecommerce.inventory_out_of_stock';
  readonly exchangeName = EVENT_TYPES.INVENTORY_OUT_OF_STOCK;
  private orderService = new OrderService();

  async handle(event: CloudEvent<InventoryOutOfStockData>): Promise<void> {
    if (await this.orderService.isDuplicateEvent(event.id!, event.type!)) {
      console.log(`↩️ Evento duplicado ignorado [${event.id}]`);
      return;
    }

    const orderId = event.data!.orderId;
    console.log(`📦 Estoque indisponível para pedido #${orderId}`);
    await this.orderService.onInventoryOutOfStock(orderId);
  }
}
