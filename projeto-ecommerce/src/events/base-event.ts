import { CloudEvent } from 'cloudevents';
import { randomUUID } from 'crypto';

export interface CreateEventInput<T> {
  type: string;
  source: string;
  subject?: string;
  data: T;
}

export function createEvent<T>({ type, source, subject, data }: CreateEventInput<T>): CloudEvent<T> {
  return new CloudEvent<T>({
    id: randomUUID(),
    type,
    source,
    subject,
    time: new Date().toISOString(),
    datacontenttype: 'application/json',
    data,
  });
}
