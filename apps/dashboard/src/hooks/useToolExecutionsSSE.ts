import { useState, useEffect, useCallback } from 'react';
import { useSSE } from './useSSE';
import type { ToolExecution } from '../types/tools';

interface ExecutionEvent {
  type: 'execution.started' | 'execution.updated' | 'execution.completed' | 'execution.failed';
  execution: ToolExecution;
  timestamp: string;
}

export function useToolExecutionsSSE(toolId?: string) {
  const [liveExecutions, setLiveExecutions] = useState<ToolExecution[]>([]);
  const { connected, lastEvent } = useSSE('/events?stream=tool-executions');
  
  useEffect(() => {
    if (!lastEvent) return;
    const event = (lastEvent as unknown) as ExecutionEvent;
    if (toolId && event.execution.toolId !== toolId) return;
    
    setLiveExecutions(prev => {
      const exists = prev.find(e => e.id === event.execution.id);
      if (exists) {
        return prev.map(e => e.id === event.execution.id ? event.execution : e);
      }
      return [event.execution, ...prev].slice(0, 50);
    });
  }, [lastEvent, toolId]);
  
  const clearExecutions = useCallback(() => {
    setLiveExecutions([]);
  }, []);
  
  return { liveExecutions, isConnected: connected, clearExecutions };
}
