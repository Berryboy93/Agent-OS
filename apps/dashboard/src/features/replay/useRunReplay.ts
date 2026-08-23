import { useEffect, useState } from 'react';
import { eventStore } from '../../event-store';
import { reduceRunState, RunState } from './reduceRunState';

export function useRunReplay(runId: string) {
  const [state, setState] = useState<RunState | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      const events = await eventStore.query({ runId });

      if (!alive) return;

      const reduced = reduceRunState(events, runId);
      setState(reduced);
    }

    load();

    // lightweight refresh (MVP replay loop)
    const interval = setInterval(load, 2000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [runId]);

  return state;
}
