import amqp from 'amqplib';
import { CloudEvent } from 'cloudevents';
import { saveEvent } from './database.js';
import { EVENT_TYPES } from './event-types.js';

const RABBITMQ_URL = 'amqp://admin:admin123@localhost:5672';

export async function startConsumer() {
  try {
    console.log('🔌 Conectando ao RabbitMQ...');

    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    console.log('✅ Conectado ao RabbitMQ');

    const queue = await channel.assertQueue('audit.log_all', {
      durable: true
    });

    console.log(`📥 Fila criada: ${queue.queue}`);

    for (const eventType of EVENT_TYPES) {
      await channel.assertExchange(eventType, 'topic', { durable: true });
      await channel.bindQueue(queue.queue, eventType, '#');
      console.log(`🔗 Escutando evento: ${eventType}`);
    }

    channel.prefetch(1);

    console.log('\n👂 Aguardando eventos...\n');

    channel.consume(queue.queue, async (msg) => {
      if (msg !== null) {
        try {
          const parsed = JSON.parse(msg.content.toString());
          const event = new CloudEvent(parsed);

          console.log(`\n📨 Evento recebido: ${event.type} [${event.id}]`);

          await new Promise(resolve => setTimeout(resolve, 1000));

          saveEvent(event);

          channel.ack(msg);

        } catch (error) {
          console.error('❌ Erro ao processar mensagem:', error);
          channel.nack(msg, false, false);
        }
      }
    });

    connection.on('error', (err) => {
      console.error('❌ Erro na conexão:', err);
    });

    connection.on('close', () => {
      console.log('🔌 Conexão fechada');
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Erro ao iniciar consumer:', error);
    process.exit(1);
  }
}
