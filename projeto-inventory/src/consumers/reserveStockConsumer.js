import { CloudEvent } from 'cloudevents';
import { reserveStock } from '../service.js';
import { assertEventQueue } from './rabbitmq.js';

const ORDER_CREATED = 'com.fake-ecommerce.order.created.v1';
const RESERVE_QUEUE = 'inventory.reserve_stock';

export async function registerReserveStockConsumer(channel) {
  const queue = await assertEventQueue(channel, {
    queueName: RESERVE_QUEUE,
    eventExchange: ORDER_CREATED,
    deadLetterRoutingKey: 'reserve_stock',
  });

  channel.consume(queue, (message) => handleOrderCreated(channel, message));
  console.log(`   ${ORDER_CREATED} -> ${RESERVE_QUEUE}`);
}

function handleOrderCreated(channel, message) {
  try {
    const parsed = JSON.parse(message.content.toString());
    const event = new CloudEvent(parsed);
    console.log(`\n📨 Evento recebido: ${event.type} [${event.id}]`);

    reserveStock(channel, event);
    channel.ack(message);
  } catch (error) {
    console.error('❌ Falha ao processar reserva:', error.message);
    channel.nack(message, false, false);
  }
}
