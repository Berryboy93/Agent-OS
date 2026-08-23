import type { TokenBudgetPolicy, TokenUsage } from '@agent-os/core';
import { AgentOSError } from '@agent-os/core';

export class TokenTracker {
  private inputTokens = 0;
  private outputTokens = 0;
  private warnFired = false;

  constructor(private readonly budget: TokenBudgetPolicy | undefined) {}

  get usage(): TokenUsage {
    return {
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      totalTokens: this.inputTokens + this.outputTokens,
    };
  }

  restore(usage: TokenUsage): void {
    this.inputTokens = usage.inputTokens;
    this.outputTokens = usage.outputTokens;
  }

  accumulate(usage: TokenUsage): 'ok' | 'warning' | 'exceeded' {
    this.inputTokens += usage.inputTokens;
    this.outputTokens += usage.outputTokens;
    return this.checkBudget();
  }

  private checkBudget(): 'ok' | 'warning' | 'exceeded' {
    if (!this.budget) return 'ok';
    const total = this.inputTokens + this.outputTokens;

    if (total > this.budget.maxTotalTokens) {
      if (this.budget.onBudgetExceeded === 'hard_stop') {
        throw AgentOSError.budgetExceeded(this.usage, this.budget.maxTotalTokens);
      }
      return 'exceeded';
    }

    if (this.budget.warnAt !== undefined && total >= this.budget.warnAt && !this.warnFired) {
      this.warnFired = true;
      return 'warning';
    }

    return 'ok';
  }

  isBudgetExceeded(): boolean {
    if (!this.budget) return false;
    return this.inputTokens + this.outputTokens > this.budget.maxTotalTokens;
  }
}
