export const CONFIG = {
  PORT: Number(process.env.PORT) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ecommerce',
  OUTBOX_POLL_INTERVAL_MS: 2000,
  OUTBOX_BATCH_SIZE:  10,
} as const;
