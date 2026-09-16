export interface FaultDomain {
  id: string;
  agents: string[];
  isolation_level: 'process' | 'container' | 'vm';
  max_failure_rate: number; // 0-1
}

export class FaultIsolator {
  private domains = new Map<string, FaultDomain>();
  private failureCounts = new Map<string, number>();
  private totalExecutions = new Map<string, number>();

  createDomain(config: Omit<FaultDomain, 'id'>): FaultDomain {
    const id = crypto.randomUUID();
    const domain: FaultDomain = { id, ...config };
    this.domains.set(id, domain);
    this.failureCounts.set(id, 0);
    this.totalExecutions.set(id, 0);
    return domain;
  }

  recordExecution(domainId: string, success: boolean): void {
    const current = this.totalExecutions.get(domainId) || 0;
    this.totalExecutions.set(domainId, current + 1);

    if (!success) {
      const failures = this.failureCounts.get(domainId) || 0;
      this.failureCounts.set(domainId, failures + 1);
    }
  }

  getFailureRate(domainId: string): number {
    const total = this.totalExecutions.get(domainId) || 0;
    if (total === 0) return 0;
    const failures = this.failureCounts.get(domainId) || 0;
    return failures / total;
  }

  isDomainHealthy(domainId: string): boolean {
    const domain = this.domains.get(domainId);
    if (!domain) return false;
    return this.getFailureRate(domainId) < domain.max_failure_rate;
  }

  getHealthyDomains(): FaultDomain[] {
    return Array.from(this.domains.values()).filter(d => this.isDomainHealthy(d.id));
  }

  isolateDomain(domainId: string): void {
    // In production: kill containers, restart VMs, drain queues
    const domain = this.domains.get(domainId);
    if (domain) {
      console.log(`[FAULT-ISOLATION] Domain ${domainId} isolated. Agents: ${domain.agents.join(', ')}`);
      // Reset counters for potential recovery
      this.failureCounts.set(domainId, 0);
      this.totalExecutions.set(domainId, 0);
    }
  }

  // Circuit breaker pattern
  private circuitStates = new Map<string, 'closed' | 'open' | 'half_open'>();

  getCircuitState(domainId: string): 'closed' | 'open' | 'half_open' {
    return this.circuitStates.get(domainId) || 'closed';
  }

  updateCircuitBreaker(domainId: string): void {
    const rate = this.getFailureRate(domainId);
    const domain = this.domains.get(domainId);
    if (!domain) return;

    if (rate >= domain.max_failure_rate) {
      this.circuitStates.set(domainId, 'open');
      this.isolateDomain(domainId);
    } else if (rate < domain.max_failure_rate * 0.5) {
      this.circuitStates.set(domainId, 'closed');
    }
  }
}
