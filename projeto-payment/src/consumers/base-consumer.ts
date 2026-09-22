import amqp from 'amqplib';
import { CloudEvent } from 'cloudevents';

const RABBITMQ_URL = 'amqp://admin:admin123@localhost:5672';

export abstract class BaseConsumer<TData = any> {
  abstract readonly queueName: string;
  abstract readonly exchangeName: string;

  protected readonly exchangeType: 'fanout' | 'direct' | 'topic' = 'topic';
  protected readonly routingKey: string = '#';

  private connection: any;
  private channel: any;

  abstract handle(event: CloudEvent<TData>): Promise<void>;

  async start() {
    await this.connect();
    await this.setupQueue();
    await this.consume();

    console.log(`🔗 ${this.exchangeName} → ${this.queueName} iniciado\n`);
  }

  private async connect() {
    this.connection = await amqp.connect(RABBITMQ_URL);
    this.channel = await this.connection.createChannel();
    this.channel.prefetch(1);

    this.connection.on('error', (err: Error) => {
      console.error('❌ Erro na conexão:', err);
    });

    this.connection.on('close', () => {
      console.log('🔌 Conexão fechada');
      process.exit(1);
    });
  }

  private async setupQueue() {
    const queue = await this.channel.assertQueue(this.queueName, { durable: true });
    await this.channel.assertExchange(this.exchangeName, this.exchangeType, { durable: true });
    await this.channel.bindQueue(queue.queue, this.exchangeName, this.routingKey);
  }

  private async consume() {
    this.channel.consume(this.queueName, async (message: any) => {
      if (message !== null) {
        try {
          const parsed = JSON.parse(message.content.toString());
          const event = new CloudEvent<TData>(parsed);
          console.log(`\n📨 Evento recebido: ${event.type} [${event.id}]`);

          await this.handle(event);

          this.channel.ack(message);
        } catch (error) {
          console.error('❌ Erro ao processar mensagem:', error);
          this.channel.nack(message, false, false);
        }
      }
    });
  }

  protected async publishEvent<T>(
    exchangeName: string,
    event: CloudEvent<T>,
    routingKey: string = '',
    exchangeType: 'fanout' | 'direct' | 'topic' = 'topic'
  ): Promise<void> {
    await this.channel.assertExchange(exchangeName, exchangeType, { durable: true });
    this.channel.publish(
      exchangeName,
      routingKey || event.type,
      Buffer.from(JSON.stringify(event)),
      {
        persistent: true,
        contentType: 'application/cloudevents+json',
        messageId: event.id,
        type: event.type,
      }
    );
    console.log(`📤 Evento publicado: ${event.type} → ${exchangeName}${routingKey ? ` [${routingKey}]` : ''}\n`);
  }

  async shutdown() {
    if (this.connection) await this.connection.close();
  }
}
