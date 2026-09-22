import { PaymentRepository } from '../repository.js';

export class PaymentService {
    constructor(private readonly repository: PaymentRepository) {}

    async processPayment(externalId: number, amount: number, paymentMethod: string, cardNumber: string) {
        if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
            throw new Error('Número do cartão inválido');
        }

        console.log(`💳 Processando pagamento - Referência Externa: ${externalId}`);

        const paymentId = this.repository.createPaymentRequest(externalId, amount, paymentMethod, cardNumber);

        return {
            paymentId,
            externalId,
            amount,
            paymentMethod,
            cardNumber
        };
    }

    async updatePaymentStatus(paymentId: number, status: string, responseData: string) {
        const processedAt = new Date().toISOString();

        this.repository.createTransaction(
            paymentId,
            0,
            status === 'approved' ? 'success' : 'failed',
            responseData
        );

        this.repository.updatePaymentStatus(paymentId, status, processedAt);

        console.log(`✅ Pagamento #${paymentId} atualizado: ${status.toUpperCase()}`);

        return {
            paymentId,
            status,
            processedAt
        };
    }

    requestVoid(orderId: number, reason: string) {
        this.repository.addVoidIntent(orderId, reason);
        return this.executeRefund(orderId);
    }

    tryRefundOnApproval(orderId: number) {
        if (!this.repository.hasVoidIntent(orderId)) {
            return null;
        }
        return this.executeRefund(orderId);
    }

    private executeRefund(orderId: number) {
        const payment = this.repository.findApprovedByExternalId(orderId);
        if (!payment) {
            console.log(`⏳ Estorno do pedido #${orderId} pendente (pagamento ainda não aprovado ou já estornado)`);
            return null;
        }

        const processedAt = new Date().toISOString();

        const applied = this.repository.markRefunded(payment.id, processedAt);
        if (applied === 0) {
            console.log(`↩️ Pagamento do pedido #${orderId} já estornado por outro fluxo`);
            return null;
        }

        this.repository.createTransaction(
            payment.id,
            payment.amount,
            'success',
            JSON.stringify({ action: 'refund', message: 'Estorno processado' }),
            'refund'
        );

        console.log(`💸 Pagamento #${payment.id} estornado (pedido #${orderId})`);

        return {
            paymentRequestId: payment.id,
            orderId,
            refundedAt: processedAt,
        };
    }
}
