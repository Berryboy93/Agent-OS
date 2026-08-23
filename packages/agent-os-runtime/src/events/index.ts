import { EventEmitter as NodeEventEmitter } from 'events';

export interface AgentEvent {
  id?: string;
  timestamp: string;
  type: string;
  payload: Record<string, any>;
  previous_hash?: string;
  hash?: string;
}

export class EventEmitter {
  private emitter = new NodeEventEmitter();
  private listeners: Array<(event: AgentEvent) => void> = [];

  on(event: string, handler: (event: AgentEvent) => void): void {
    this.emitter.on(event, handler);
  }

  async emit(event: Omit<AgentEvent, 'id' | 'timestamp' | 'hash'>): Promise<AgentEvent> {
    const fullEvent: AgentEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      hash: await this.computeHash(event)
    };

    this.emitter.emit(event.type, fullEvent);
    this.emitter.emit('*', fullEvent);

    for (const listener of this.listeners) {
      listener(fullEvent);
    }

    return fullEvent;
  }

  addGlobalListener(listener: (event: AgentEvent) => void): void {
    this.listeners.push(listener);
  }

  private async computeHash(event: any): Promise<string> {
    const data = JSON.stringify(event);
    // In production, use crypto.subtle.digest or Node crypto
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }
}
