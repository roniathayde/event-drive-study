import { createApp } from './app.js';
import { CONFIG } from './config/constants.js';
import { EventPublisher } from './events/event-publisher.js';
import { OutboxRelay } from './outbox/outbox-relay.js';
import { PaymentApprovedConsumer } from './consumers/payment-approved-consumer.js';
import { PaymentDeclinedConsumer } from './consumers/payment-declined-consumer.js';
import { PaymentRefundedConsumer } from './consumers/payment-refunded-consumer.js';
import { InventoryReservedConsumer } from './consumers/inventory-reserved-consumer.js';
import { InventoryOutOfStockConsumer } from './consumers/inventory-out-of-stock-consumer.js';
import { InventoryReleasedConsumer } from './consumers/inventory-released-consumer.js';

const app = await createApp();

app.listen(CONFIG.PORT, () => {
  console.log(`\n🚀 Server running on port ${CONFIG.PORT}`);
  console.log(`📝 POST http://localhost:${CONFIG.PORT}/api/orders`);
  console.log(`📝 GET  http://localhost:${CONFIG.PORT}/api/orders/:id`);
  console.log(`📝 POST http://localhost:${CONFIG.PORT}/api/orders/:id/cancel\n`);
});

const outboxRelay = new OutboxRelay(new EventPublisher());
await outboxRelay.start();

const consumers = [
  new PaymentApprovedConsumer(),
  new PaymentDeclinedConsumer(),
  new PaymentRefundedConsumer(),
  new InventoryReservedConsumer(),
  new InventoryOutOfStockConsumer(),
  new InventoryReleasedConsumer(),
];

for (const consumer of consumers) {
  consumer.start();
}

async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} recebido, encerrando...`);
  await outboxRelay.stop();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
