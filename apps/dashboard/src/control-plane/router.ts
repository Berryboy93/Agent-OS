import { QueryClient } from '@tanstack/react-query';
import { ControlEvent } from './events';

export class ControlPlaneRouter {
  constructor(private queryClient: QueryClient) {}

  handle(event: ControlEvent) {
    switch (event.type) {
      case 'run.started':
      case 'run.updated':
      case 'run.completed':
        this.queryClient.invalidateQueries({ queryKey: ['runs'] });
        break;

      case 'agent.updated':
        this.queryClient.invalidateQueries({ queryKey: ['agents'] });
        break;

      case 'approval.updated':
        this.queryClient.invalidateQueries({ queryKey: ['approvals'] });
        break;

      case 'deployment.updated':
        this.queryClient.invalidateQueries({ queryKey: ['deployments'] });
        break;

      case 'system.health':
        this.queryClient.invalidateQueries({ queryKey: ['health'] });
        break;
    }
  }
}
