import { MemoryEventStore } from './memoryStore';

export const eventStore = new MemoryEventStore();

type Listener = (event: any) => void;

const listeners: Set<Listener> = new Set();

export function subscribe(listener: Listener) {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

function emit(event: any) {
  for (const l of listeners) {
    try {
      l(event);
    } catch (err) {
      console.warn('event listener error', err);
    }
  }
}
