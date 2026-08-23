import { useEffect, useState } from 'react';
import { eventStore } from '../../event-store';
import type { StoredEvent } from '../../event-store/types';

export function useRunTimeline(runId: string) {
  const [events, setEvents] = useState<StoredEvent[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      const result = await eventStore.query({ runId });
      if (active) setEvents(result);
    }

    load();

    // lightweight polling ONLY for dev MVP (not production stream yet)
    const interval = setInterval(load, 2000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [runId]);

  return events;
}
