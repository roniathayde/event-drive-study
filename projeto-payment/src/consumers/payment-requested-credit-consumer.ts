import { CloudEvent } from 'cloudevents';
import { randomUUID } from 'crypto';
import { SIMULATE_PAYMENT_FAILURE } from '../config.js';
import { EVENT_SOURCES, EVENT_TYPES } from '../events/event-types.js';
import { BaseConsumer } from './base-consumer.js';

interface PaymentRequestedData {
    paymentRequestId: number;
    externalId: number;
    amount: number;
    paymentMethod: string;
    cardNumber: string;
}

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

export class PaymentRequestedCreditConsumer extends BaseConsumer<PaymentRequestedData> {
    readonly queueName = 'credit_gateway.process_payment';
    readonly exchangeName = EVENT_TYPES.PAYMENT_REQUESTED;
    protected readonly exchangeType = 'topic';
    protected readonly routingKey = 'credit';

    async handle(event: CloudEvent<PaymentRequestedData>): Promise<void> {
        const data = event.data!;

        console.log(`💳 [CREDIT GATEWAY] Processando pagamento #${data.paymentRequestId}...`);

        await new Promise(resolve => setTimeout(resolve, 2000));

        const gatewayResponse = SIMULATE_PAYMENT_FAILURE
            ? { code: '51', message: 'Declined by Credit Gateway (insufficient funds)' }
            : { code: '00', message: 'Approved by Credit Gateway' };

        const processedEvent = new CloudEvent<PaymentProcessedData>({
            id: randomUUID(),
            type: EVENT_TYPES.PAYMENT_PROCESSED,
            source: EVENT_SOURCES.CREDIT_GATEWAY,
            subject: `payment-${data.paymentRequestId}`,
            time: new Date().toISOString(),
            datacontenttype: 'application/json',
            data: {
                paymentRequestId: data.paymentRequestId,
                externalId: data.externalId,
                amount: data.amount,
                status: SIMULATE_PAYMENT_FAILURE ? 'declined' : 'approved',
                gateway: 'credit',
                gatewayResponse,
            },
        });

        await this.publishEvent(EVENT_TYPES.PAYMENT_PROCESSED, processedEvent);
        console.log(
            SIMULATE_PAYMENT_FAILURE
                ? `❌ [CREDIT GATEWAY] Pagamento RECUSADO pelo gateway (simulação de falha)`
                : `✅ [CREDIT GATEWAY] Pagamento aprovado pelo gateway`
        );
    }
}
