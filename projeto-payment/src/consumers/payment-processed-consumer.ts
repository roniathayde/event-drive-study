import { CloudEvent } from 'cloudevents';
import { randomUUID } from 'crypto';
import { EVENT_SOURCES, EVENT_TYPES } from '../events/event-types.js';
import { PaymentService } from '../services/payment-service.js';
import { BaseConsumer } from './base-consumer.js';
import { buildPaymentRefundedEvent } from './refund-event.js';

interface PaymentProcessedData {
  paymentRequestId: number;
  externalId: number;
  amount: number;
  status: 'approved' | 'declined';
  gateway: 'credit' | 'debit';
  gatewayResponse: {
    code: string;
    message: string;
  };
}

interface PaymentApprovedData {
  externalId: number;
  paymentRequestId: number;
  status: string;
  processedAt: string;
}

interface PaymentDeclinedData {
  externalId: number;
  paymentRequestId: number;
  status: string;
  reason: string;
  processedAt: string;
}

export class PaymentProcessedConsumer extends BaseConsumer<PaymentProcessedData> {
    readonly queueName = 'payment.update_status';
    readonly exchangeName = EVENT_TYPES.PAYMENT_PROCESSED;

    constructor(private readonly service: PaymentService) {
        super();
    }

    async handle(event: CloudEvent<PaymentProcessedData>): Promise<void> {
        const data = event.data!;

        console.log(`📨 [PAYMENT PROCESSED] Evento recebido de ${data.gateway.toUpperCase()} Gateway`);
        console.log(`   Pagamento #${data.paymentRequestId} - Status: ${data.status}`);

        const responseData = JSON.stringify(data.gatewayResponse);
        const result = await this.service.updatePaymentStatus(
            data.paymentRequestId,
            data.status,
            responseData
        );

        const isApproved = result.status === 'approved';
        const externalType = isApproved ? EVENT_TYPES.PAYMENT_APPROVED : EVENT_TYPES.PAYMENT_DECLINED;

        const externalData = isApproved
            ? {
                externalId: data.externalId,
                paymentRequestId: result.paymentId,
                status: result.status,
                processedAt: result.processedAt,
              } satisfies PaymentApprovedData
            : {
                externalId: data.externalId,
                paymentRequestId: result.paymentId,
                status: result.status,
                reason: data.gatewayResponse.message,
                processedAt: result.processedAt,
              } satisfies PaymentDeclinedData;

        const externalEvent = new CloudEvent({
            id: randomUUID(),
            type: externalType,
            source: EVENT_SOURCES.PAYMENT_SERVICE,
            subject: `order-${data.externalId}`,
            time: new Date().toISOString(),
            datacontenttype: 'application/json',
            data: externalData,
        });

        await this.publishEvent(externalType, externalEvent);
        console.log(`📤 [PAYMENT PROCESSED] Evento externo publicado: ${externalType}`);

        if (isApproved) {
            const refund = this.service.tryRefundOnApproval(data.externalId);
            if (refund) {
                await this.publishEvent(EVENT_TYPES.PAYMENT_REFUNDED, buildPaymentRefundedEvent(refund));
                console.log(`📤 [PAYMENT PROCESSED] Estorno imediato publicado (intenção pré-registrada) para pedido #${data.externalId}`);
            }
        }
    }
}
