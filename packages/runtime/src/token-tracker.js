import { AgentOSError } from '@agent-os/core';
export class TokenTracker {
    budget;
    inputTokens = 0;
    outputTokens = 0;
    warnFired = false;
    constructor(budget) {
        this.budget = budget;
    }
    get usage() {
        return {
            inputTokens: this.inputTokens,
            outputTokens: this.outputTokens,
            totalTokens: this.inputTokens + this.outputTokens,
        };
    }
    restore(usage) {
        this.inputTokens = usage.inputTokens;
        this.outputTokens = usage.outputTokens;
    }
    accumulate(usage) {
        this.inputTokens += usage.inputTokens;
        this.outputTokens += usage.outputTokens;
        return this.checkBudget();
    }
    checkBudget() {
        if (!this.budget)
            return 'ok';
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
    isBudgetExceeded() {
        if (!this.budget)
            return false;
        return this.inputTokens + this.outputTokens > this.budget.maxTotalTokens;
    }
}
//# sourceMappingURL=token-tracker.js.map