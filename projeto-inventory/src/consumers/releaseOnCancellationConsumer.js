import { CloudEvent } from 'cloudevents';
import { releaseStock } from '../service.js';
import { assertEventQueue } from './rabbitmq.js';

const ORDER_CANCELLATION_REQUESTED = 'com.fake-ecommerce.order.cancellation.requested.v1';
const RELEASE_ON_CANCELLATION_QUEUE = 'inventory.release_stock.cancellation';

export async function registerReleaseOnCancellationConsumer(channel) {
  const queue = await assertEventQueue(channel, {
    queueName: RELEASE_ON_CANCELLATION_QUEUE,
    eventExchange: ORDER_CANCELLATION_REQUESTED,
    deadLetterRoutingKey: 'release_stock.cancellation',
  });

  channel.consume(queue, (message) => handleCancellationRequested(channel, message));
  console.log(`   ${ORDER_CANCELLATION_REQUESTED} -> ${RELEASE_ON_CANCELLATION_QUEUE}`);
}

function handleCancellationRequested(channel, message) {
  try {
    const parsed = JSON.parse(message.content.toString());
    const event = new CloudEvent(parsed);
    console.log(`\n📨 Evento recebido: ${event.type} [${event.id}]`);

    releaseStock(channel, event);
    channel.ack(message);
  } catch (error) {
    console.error('❌ Falha ao processar devolução:', error.message);
    channel.nack(message, false, false);
  }
}
