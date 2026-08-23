export class ExecutionMemory {
    store = new Map();
    runId;
    constructor(runId) {
        this.runId = runId;
    }
    get(key) {
        return this.store.get(key);
    }
    dispatchMutation(key, value) {
        this.store.set(key, value);
    }
    has(key) {
        return this.store.has(key);
    }
    delete(key) {
        return this.store.delete(key);
    }
    clear() {
        this.store.clear();
    }
    snapshot() {
        return Object.fromEntries(this.store);
    }
    restore(snapshot) {
        this.store.clear();
        for (const [k, v] of Object.entries(snapshot)) {
            this.store.set(k, v);
        }
    }
    asAccessor() {
        return {
            get: (key) => this.get(key),
            set: (key, value) => this.store.set(key, value),
        };
    }
}
//# sourceMappingURL=execution-memory.js.map