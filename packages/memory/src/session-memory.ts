interface SessionEntry {
  value: unknown;
  expiresAt: number;
}

export interface SessionMemoryConfig {
  defaultTtlMs: number;
}

export class SessionMemory {
  private readonly store = new Map<string, SessionEntry>();
  private readonly defaultTtlMs: number;

  constructor(
    config: SessionMemoryConfig = { defaultTtlMs: 24 * 60 * 60 * 1000 },
  ) {
    this.defaultTtlMs = config.defaultTtlMs;
  }

  dispatchMutation(key: string, value: unknown, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.store.set(key,
      { value, expiresAt },  );
  }

  get(key: string): unknown {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  evictExpired(): number {
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

  size(): number {
    this.evictExpired();
    return this.store.size;
  }
}
