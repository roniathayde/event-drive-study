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

export class PaymentRequestedDebitConsumer extends BaseConsumer<PaymentRequestedData> {
    readonly queueName = 'debit_gateway.process_payment';
    readonly exchangeName = EVENT_TYPES.PAYMENT_REQUESTED;
    protected readonly exchangeType = 'topic';
    protected readonly routingKey = 'debit';

    async handle(event: CloudEvent<PaymentRequestedData>): Promise<void> {
        const data = event.data!;

        console.log(`💳 [DEBIT GATEWAY] Processando pagamento #${data.paymentRequestId}...`);

        await new Promise(resolve => setTimeout(resolve, 1500));

        const gatewayResponse = SIMULATE_PAYMENT_FAILURE
            ? { code: '51', message: 'Declined by Debit Gateway (insufficient funds)' }
            : { code: '00', message: 'Approved by Debit Gateway' };

        const processedEvent = new CloudEvent<PaymentProcessedData>({
            id: randomUUID(),
            type: EVENT_TYPES.PAYMENT_PROCESSED,
            source: EVENT_SOURCES.DEBIT_GATEWAY,
            subject: `payment-${data.paymentRequestId}`,
            time: new Date().toISOString(),
            datacontenttype: 'application/json',
            data: {
                paymentRequestId: data.paymentRequestId,
                externalId: data.externalId,
                amount: data.amount,
                status: SIMULATE_PAYMENT_FAILURE ? 'declined' : 'approved',
                gateway: 'debit',
                gatewayResponse,
            },
        });

        await this.publishEvent(EVENT_TYPES.PAYMENT_PROCESSED, processedEvent);
        console.log(
            SIMULATE_PAYMENT_FAILURE
                ? `❌ [DEBIT GATEWAY] Pagamento RECUSADO pelo gateway (simulação de falha)`
                : `✅ [DEBIT GATEWAY] Pagamento aprovado pelo gateway`
        );
    }
}
