import { CloudEvent } from 'cloudevents';
import { OrderService } from '../services/order-service.js';
import { EVENT_TYPES } from '../events/event-types.js';
import { BaseConsumer } from './base-consumer.js';

interface PaymentApprovedData {
  externalId: number;
  paymentRequestId: number;
  status: string;
  processedAt: string;
}

export class PaymentApprovedConsumer extends BaseConsumer<PaymentApprovedData> {
  readonly queueName = 'ecommerce.payment_confirmation';
  readonly exchangeName = EVENT_TYPES.PAYMENT_APPROVED;
  private orderService = new OrderService();

  async handle(event: CloudEvent<PaymentApprovedData>): Promise<void> {
    const data = event.data!;

    if (await this.orderService.isDuplicateEvent(event.id!, event.type!)) {
      console.log(`↩️ Evento duplicado ignorado [${event.id}]`);
      return;
    }

    console.log(`💳 Processando pagamento aprovado`);
    console.log(`   Order ID: ${data.externalId}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Processado em: ${data.processedAt}`);

    try {
      await this.orderService.confirmPayment(data.externalId);

      console.log(`✓ Pagamento aprovado processado com sucesso\n`);
    } catch (error) {
      console.error(`❌ Erro ao processar pagamento aprovado:`, error);
      throw error;
    }
  }
}
