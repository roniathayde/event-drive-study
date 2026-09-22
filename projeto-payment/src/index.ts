import { OrderCreatedConsumer } from './consumers/order-created-consumer.js';
import { PaymentRequestedCreditConsumer } from './consumers/payment-requested-credit-consumer.js';
import { PaymentRequestedDebitConsumer } from './consumers/payment-requested-debit-consumer.js';
import { PaymentProcessedConsumer } from './consumers/payment-processed-consumer.js';
import { InventoryOutOfStockConsumer } from './consumers/inventory-out-of-stock-consumer.js';
import { OrderCancellationRequestedConsumer } from './consumers/order-cancellation-requested-consumer.js';
import { SIMULATE_PAYMENT_FAILURE } from './config.js';
import { createTables } from './database/database.js';
import { PaymentRepository } from './repository.js';
import { PaymentService } from './services/payment-service.js';

console.log('🚀 Sistema de Pagamento iniciando...\n');

if (SIMULATE_PAYMENT_FAILURE) {
  console.log('⚠️  MODO SIMULAÇÃO DE FALHA ATIVO: todos os pagamentos serão RECUSADOS\n');
}

console.log('📦 Criando tabelas do banco de dados...');
createTables();
console.log('✅ Banco de dados inicializado\n');

console.log('🔌 Conectando ao RabbitMQ...');

const repository = new PaymentRepository();
const paymentService = new PaymentService(repository);

const consumers = [
  new OrderCreatedConsumer(paymentService),
  new PaymentRequestedCreditConsumer(),
  new PaymentRequestedDebitConsumer(),
  new PaymentProcessedConsumer(paymentService),
  new InventoryOutOfStockConsumer(paymentService),
  new OrderCancellationRequestedConsumer(paymentService),
];

for (const consumer of consumers) {
  await consumer.start();
}

console.log('👂 Aguardando eventos...\n');

async function shutdown() {
  console.log('\n🛑 Encerrando Sistema de Pagamento...');
  for (const consumer of consumers) {
    await consumer.shutdown();
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
