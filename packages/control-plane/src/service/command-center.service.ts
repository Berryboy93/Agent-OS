import { ControlPlaneServer } from '../api/control-plane.server.js';
import { COMMAND_CENTER_CONFIG } from '../config/command-center.config.js';

export interface AgentRun {
  id: string;
  agent: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: number;
  updatedAt: number;
}

export class CommandCenterService {
  private controlPlane: ControlPlaneServer;
  private activeRuns: Map<string, AgentRun> = new Map();

  constructor(dbPath: string) {
    this.controlPlane = new ControlPlaneServer();
  }

  async listRuns(filter?: { status?: string; limit?: number; offset?: number }) {
    const limit = Math.min(filter?.limit ?? COMMAND_CENTER_CONFIG.api.defaultLimit, COMMAND_CENTER_CONFIG.api.maxLimit);
    const offset = filter?.offset ?? 0;
    
    const runs = Array.from(this.activeRuns.values())
      .filter(r => !filter?.status || r.status === filter.status)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(offset, offset + limit);

    return { data: runs, total: this.activeRuns.size, limit, offset };
  }

  async getRun(runId: string) {
    const run = this.activeRuns.get(runId);
    if (!run) throw new Error(`Run ${runId} not found`);
    return run;
  }

  async createRun(agent: string): Promise<AgentRun> {
    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const run: AgentRun = { id: runId, agent, status: 'pending', createdAt: Date.now(), updatedAt: Date.now() };
    this.activeRuns.set(runId, run);
    this.controlPlane.broadcast({ event: 'run:created', data: run });
    return run;
  }

  async updateRunStatus(runId: string, status: AgentRun['status']) {
    const run = this.activeRuns.get(runId);
    if (!run) throw new Error(`Run ${runId} not found`);
    run.status = status;
    run.updatedAt = Date.now();
    this.activeRuns.set(runId, run);
    this.controlPlane.broadcast({ event: 'run:updated', data: run });
    return run;
  }

  async dispatchCommand(runId: string, command: string, args?: Record<string, any>) {
    await this.getRun(runId);
    const commandEvent = {
      id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      runId, command, args: args ?? {}, dispatchedAt: Date.now(), status: 'dispatched' as const
    };
    this.controlPlane.broadcast({ event: 'command:dispatched', data: commandEvent });
    return commandEvent;
  }

  handleEventStream(res: any) {
    this.controlPlane.handleSSE(res);
    res.write(`data: ${JSON.stringify({ type: 'connection', status: 'connected' })}\n\n`);
  }

  getRoles() { return this.controlPlane.getRoles(); }
  getPolicies() { return this.controlPlane.getPolicies(); }
  broadcast(data: any) { this.controlPlane.broadcast(data); }
}
