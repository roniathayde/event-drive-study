import pg from 'pg';
import { CloudEvent } from 'cloudevents';
import { withTransaction } from '../database/database.js';
import { OutboxRepository, OutboxMessage } from '../repositories/outbox-repository.js';
import { EventPublisher } from '../events/event-publisher.js';
import { CONFIG } from '../config/constants.js';

export class OutboxRelay {
  private timer: NodeJS.Timeout | null = null;
  private stopped = false;

  constructor(
    private readonly publisher: EventPublisher,
    private readonly outboxRepository = new OutboxRepository(),
    private readonly pollIntervalMs = CONFIG.OUTBOX_POLL_INTERVAL_MS,
    private readonly batchSize = CONFIG.OUTBOX_BATCH_SIZE
  ) {}

  async start(): Promise<void> {
    await this.publisher.connect();
    this.scheduleNextTick();
    console.log(`📮 Outbox relay iniciado (intervalo: ${this.pollIntervalMs}ms)\n`);
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    await this.publisher.disconnect();
  }

  private scheduleNextTick(): void {
    this.timer = setTimeout(() => this.tick(), this.pollIntervalMs);
  }

  private async tick(): Promise<void> {
    try {
      await this.dispatchPendingEvents();
    } catch (error) {
      console.error('❌ Erro no outbox relay:', error);
    } finally {
      if (!this.stopped) this.scheduleNextTick();
    }
  }

  async dispatchPendingEvents(): Promise<number> {
    return withTransaction(async (tx) => {
      const pending = await this.outboxRepository.fetchUnpublished(tx, this.batchSize);
      for (const message of pending) {
        await this.publishOne(message, tx);
      }
      return pending.length;
    });
  }

  private async publishOne(message: OutboxMessage, tx: pg.PoolClient): Promise<void> {
    try {
      await this.publisher.publish(new CloudEvent(message.payload));
      await this.outboxRepository.markPublished(message.id, tx);
    } catch (error) {
      console.error(`❌ Falha ao publicar evento da outbox [${message.eventId}]:`, error);
      await this.outboxRepository.markFailed(message.id, String(error), tx);
    }
  }
}
