import amqp from 'amqplib';
import { assertInventoryExchanges } from './service.js';
import { assertDeadLetterExchange } from './consumers/rabbitmq.js';
import { registerReserveStockConsumer } from './consumers/reserveStockConsumer.js';
import { registerReleaseOnPaymentDeclinedConsumer } from './consumers/releaseOnPaymentDeclinedConsumer.js';
import { registerReleaseOnCancellationConsumer } from './consumers/releaseOnCancellationConsumer.js';

const RABBITMQ_URL = 'amqp://admin:admin123@localhost:5672';

export async function startConsumer() {
  console.log('🔌 Conectando ao RabbitMQ...');
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();
  console.log('✅ Conectado ao RabbitMQ');

  await assertInventoryExchanges(channel);
  await assertDeadLetterExchange(channel);
  channel.prefetch(1);

  console.log('\n👂 Um consumidor por evento:');
  await registerReserveStockConsumer(channel);
  await registerReleaseOnPaymentDeclinedConsumer(channel);
  await registerReleaseOnCancellationConsumer(channel);
  console.log('');

  connection.on('close', () => {
    console.log('🔌 Conexão fechada');
    process.exit(1);
  });
}
