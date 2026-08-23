export interface LogEntry<T = any> {
  sequence: number;
  timestamp: number;
  type: string;
  payload: T;
  previousHash: string;
  hash: string;
}

export class AppendLog<T = any> {
  private entries: LogEntry<T>[] = [];
  private sequence = 0;

  append(type: string, payload: T): LogEntry<T> {
    this.sequence += 1;
    const previousHash = this.entries.length > 0
      ? this.entries[this.entries.length - 1].hash
      : '0'.repeat(64);

    const entry: LogEntry<T> = {
      sequence: this.sequence,
      timestamp: Date.now(),
      type,
      payload,
      previousHash,
      hash: this.computeHash(this.sequence, type, payload, previousHash),
    };

    this.entries.push(entry);
    return entry;
  }

  getEntries(): readonly LogEntry<T>[] {
    return this.entries;
  }

  getLast(): LogEntry<T> | undefined {
    return this.entries[this.entries.length - 1];
  }

  private computeHash(seq: number, type: string, payload: T, prev: string): string {
    const data = `${seq}:${type}:${JSON.stringify(payload)}:${prev}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }
}
