export interface SessionMemoryConfig {
    defaultTtlMs: number;
}
export declare class SessionMemory {
    private readonly store;
    private readonly defaultTtlMs;
    constructor(config?: SessionMemoryConfig);
    dispatchMutation(key: string, value: unknown, ttlMs?: number): void;
    get(key: string): unknown;
    has(key: string): boolean;
    delete(key: string): void;
    evictExpired(): number;
    size(): number;
}
//# sourceMappingURL=session-memory.d.ts.map