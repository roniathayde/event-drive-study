import { CloudEvent } from 'cloudevents';
import { releaseStock } from '../service.js';
import { assertEventQueue } from './rabbitmq.js';

const PAYMENT_DECLINED = 'com.fake-ecommerce.payment.declined.v1';
const RELEASE_ON_PAYMENT_DECLINED_QUEUE = 'inventory.release_stock.payment_declined';

export async function registerReleaseOnPaymentDeclinedConsumer(channel) {
  const queue = await assertEventQueue(channel, {
    queueName: RELEASE_ON_PAYMENT_DECLINED_QUEUE,
    eventExchange: PAYMENT_DECLINED,
    deadLetterRoutingKey: 'release_stock.payment_declined',
  });

  channel.consume(queue, (message) => handlePaymentDeclined(channel, message));
  console.log(`   ${PAYMENT_DECLINED} -> ${RELEASE_ON_PAYMENT_DECLINED_QUEUE}`);
}

function handlePaymentDeclined(channel, message) {
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
