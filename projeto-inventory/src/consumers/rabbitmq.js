export const DLX = 'inventory.dlx';

export async function assertDeadLetterExchange(channel) {
  await channel.assertExchange(DLX, 'topic', { durable: true });
}

export async function assertEventQueue(channel, { queueName, eventExchange, deadLetterRoutingKey }) {
  const queue = await channel.assertQueue(queueName, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': DLX,
      'x-dead-letter-routing-key': deadLetterRoutingKey,
    },
  });

  await channel.assertExchange(eventExchange, 'topic', { durable: true });
  await channel.bindQueue(queue.queue, eventExchange, '#');

  await assertDeadLetterQueue(channel, queueName, deadLetterRoutingKey);

  return queue.queue;
}

async function assertDeadLetterQueue(channel, sourceQueueName, deadLetterRoutingKey) {
  const dlq = await channel.assertQueue(`${sourceQueueName}.dlq`, { durable: true });
  await channel.bindQueue(dlq.queue, DLX, deadLetterRoutingKey);
}
