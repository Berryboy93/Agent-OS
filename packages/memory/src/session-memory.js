export class SessionMemory {
    store = new Map();
    defaultTtlMs;
    constructor(config = { defaultTtlMs: 24 * 60 * 60 * 1000 }) {
        this.defaultTtlMs = config.defaultTtlMs;
    }
    dispatchMutation(key, value, ttlMs) {
        const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
        this.store.set(key, { value, expiresAt });
    }
    get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return undefined;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return undefined;
        }
        return entry.value;
    }
    has(key) {
        return this.get(key) !== undefined;
    }
    delete(key) {
        this.store.delete(key);
    }
    evictExpired() {
        const now = Date.now();
        let count = 0;
        for (const [key, entry] of this.store) {
            if (now > entry.expiresAt) {
                this.store.delete(key);
                count++;
            }
        }
        return count;
    }
    size() {
        this.evictExpired();
        return this.store.size;
    }
}
//# sourceMappingURL=session-memory.js.map