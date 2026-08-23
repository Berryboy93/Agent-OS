export declare class ExecutionMemory {
    private readonly store;
    readonly runId: string;
    constructor(runId: string);
    get(key: string): unknown;
    dispatchMutation(key: string, value: unknown): void;
    has(key: string): boolean;
    delete(key: string): boolean;
    clear(): void;
    snapshot(): Record<string, unknown>;
    restore(snapshot: Record<string, unknown>): void;
    asAccessor(): {
        get: (key: string) => unknown;
        set: (key: string, value: unknown) => void;
    };
}
//# sourceMappingURL=execution-memory.d.ts.map