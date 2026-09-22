import amqp from 'amqplib';
import { CloudEvent } from 'cloudevents';
import { CONFIG } from '../config/constants.js';

export class EventPublisher {
  private connection: any = null;
  private channel: any = null;
  private isConnected = false;

  constructor(
    private readonly rabbitMqUrl: string = CONFIG.RABBITMQ_URL
  ) {}

  async connect(): Promise<void> {
    try {
      console.log('🔌 Conectando ao RabbitMQ...');

      this.connection = await amqp.connect(this.rabbitMqUrl);
      this.channel = await this.connection.createChannel();

      this.connection.on('error', (err: Error) => {
        console.error('❌ Erro na conexão RabbitMQ:', err);
        this.isConnected = false;
      });

      this.connection.on('close', () => {
        console.log('🔌 Conexão RabbitMQ fechada');
        this.isConnected = false;
      });

      this.isConnected = true;
      console.log('✅ Conectado ao RabbitMQ com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao conectar ao RabbitMQ:', error);
      throw error;
    }
  }

  async publish<T>(event: CloudEvent<T>): Promise<void> {
    if (!this.isConnected || !this.channel) {
      await this.connect();
    }

    const exchangeName = event.type;

    try {
      await this.channel.assertExchange(exchangeName, 'topic', {
        durable: true,
      });

      const published = this.channel.publish(
        exchangeName,
        event.type,
        Buffer.from(JSON.stringify(event)),
        {
          persistent: true,
          contentType: 'application/cloudevents+json',
          timestamp: Date.now(),
          messageId: event.id,
          type: event.type,
        }
      );

      if (published) {
        console.log(`📤 Evento publicado: ${event.type} [${event.id}]`, {
          exchange: exchangeName,
          subject: event.subject,
        });
      } else {
        console.warn('⚠️ Buffer cheio, evento enfileirado internamente');
      }
    } catch (error) {
      console.error(`❌ Erro ao publicar evento ${event.type}:`, error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.isConnected = false;
      console.log('✅ Desconectado do RabbitMQ');
    } catch (error) {
      console.error('❌ Erro ao desconectar do RabbitMQ:', error);
      throw error;
    }
  }

  get connected(): boolean {
    return this.isConnected;
  }
}
