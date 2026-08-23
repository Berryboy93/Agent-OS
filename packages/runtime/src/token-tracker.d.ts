import type { TokenBudgetPolicy, TokenUsage } from '@agent-os/core';
export declare class TokenTracker {
    private readonly budget;
    private inputTokens;
    private outputTokens;
    private warnFired;
    constructor(budget: TokenBudgetPolicy | undefined);
    get usage(): TokenUsage;
    restore(usage: TokenUsage): void;
    accumulate(usage: TokenUsage): 'ok' | 'warning' | 'exceeded';
    private checkBudget;
    isBudgetExceeded(): boolean;
}
//# sourceMappingURL=token-tracker.d.ts.map