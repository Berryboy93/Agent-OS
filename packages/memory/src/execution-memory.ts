export class ExecutionMemory {
  private readonly store = new Map<string, unknown>();
  readonly runId: string;

  constructor(runId: string) {
    this.runId = runId;
  }

  get(key: string): unknown {
    return this.store.get(key);
  }

  dispatchMutation(key: string, value: unknown): void {
    this.store.set(key,
      value,  );
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  snapshot(): Record<string, unknown> {
    return Object.fromEntries(this.store);
  }

  restore(snapshot: Record<string, unknown>): void {
    this.store.clear();
    for (const [k, v] of Object.entries(snapshot)) {
      this.store.set(k, v);
    }
  }

  asAccessor(): {
    get: (key: string) => unknown;
    set: (key: string, value: unknown) => void;
  } {
    return {
      get: (key: string) => this.get(key),
      set: (key: string, value: unknown) =>
        this.store.set(key, value),
    };
  }
}
