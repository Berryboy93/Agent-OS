import { useEffect, useState, useMemo } from 'react';
import { eventStore } from '../../event-store';
import type { StoredEvent } from '../../event-store/types';

export type EventFilter = {
  runId?: string;
  agentId?: string;
  type?: string;
  search?: string;
};

export function useEventInspector(filter: EventFilter = {}) {
  const [events, setEvents] = useState<StoredEvent[]>([]);

  useEffect(() => {
    let alive = true;

    async function load() {
      const all = await eventStore.query({});

      if (!alive) return;

      setEvents(all);
    }

    load();

    const interval = setInterval(load, 1500);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (filter.runId && e.runId !== filter.runId) return false;
      if (filter.agentId && e.agentId !== filter.agentId) return false;
      if (filter.type && e.type !== filter.type) return false;

      if (filter.search) {
        const s = filter.search.toLowerCase();
        return JSON.stringify(e).toLowerCase().includes(s);
      }

      return true;
    });
  }, [events, filter]);

  return filtered;
}
