import { CloudEvent } from 'cloudevents';
import { OrderService } from '../services/order-service.js';
import { EVENT_TYPES } from '../events/event-types.js';
import { BaseConsumer } from './base-consumer.js';

interface PaymentDeclinedData {
  externalId: number;
  paymentRequestId: number;
  status: string;
  reason: string;
  processedAt: string;
}

export class PaymentDeclinedConsumer extends BaseConsumer<PaymentDeclinedData> {
  readonly queueName = 'ecommerce.payment_decline_handling';
  readonly exchangeName = EVENT_TYPES.PAYMENT_DECLINED;
  private orderService = new OrderService();

  async handle(event: CloudEvent<PaymentDeclinedData>): Promise<void> {
    const data = event.data!;

    if (await this.orderService.isDuplicateEvent(event.id!, event.type!)) {
      console.log(`↩️ Evento duplicado ignorado [${event.id}]`);
      return;
    }

    console.log(`💳 Processando pagamento recusado`);
    console.log(`   Order ID: ${data.externalId}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Motivo: ${data.reason}`);
    console.log(`   Processado em: ${data.processedAt}`);

    try {
      await this.orderService.declinePayment(data.externalId, data.reason);
      console.log(`✓ Pagamento recusado processado com sucesso`);
    } catch (error) {
      console.error(`❌ Erro ao processar pagamento recusado:`, error);
      throw error;
    }
  }
}
