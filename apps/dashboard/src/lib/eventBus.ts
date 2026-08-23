type Listener<T> = (payload: T) => void;

export class EventBus<T extends { type?: string } = { type?: string }> {
  private listeners = new Set<Listener<T>>();

  subscribe(listener: Listener<T>) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  publish(payload: T) {
    for (const listener of this.listeners) listener(payload);
  }

  clear() {
    this.listeners.clear();
  }
}
