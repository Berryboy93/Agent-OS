import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';

export interface KafkaEventStoreConfig {
  brokers: string[];
  clientId: string;
  topic: string;
  consumerGroup: string;
}

export class KafkaEventStore {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private topic: string;
  private handlers = new Map<string, Array<(payload: any) => void>>();

  constructor(config: KafkaEventStoreConfig) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers
    });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: config.consumerGroup });
    this.topic = config.topic;
  }

  async init(): Promise<void> {
    await this.producer.connect();
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: true });

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
        if (!message.value) return;
        const event = JSON.parse(message.value.toString());
        const handlers = this.handlers.get(event.type) || [];
        for (const handler of handlers) {
          handler(event);
        }
        // Global handlers
        const globalHandlers = this.handlers.get('*') || [];
        for (const handler of globalHandlers) {
          handler(event);
        }
      }
    });
  }

  async append(event: {
    type: string;
    payload: Record<string, any>;
    timestamp?: string;
  }): Promise<void> {
    await this.producer.send({
      topic: this.topic,
      messages: [{
        key: event.type,
        value: JSON.stringify({
          ...event,
          timestamp: event.timestamp || new Date().toISOString()
        })
      }]
    });
  }

  on(eventType: string, handler: (payload: any) => void): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  async close(): Promise<void> {
    await this.producer.disconnect();
    await this.consumer.disconnect();
  }
}
