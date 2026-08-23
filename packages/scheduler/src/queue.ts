export type JobStatus =
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed";

export interface QueueJob<TData = unknown> {
  id: string;
  name: string;
  data: TData;
  priority: number;
  attempts: number;
  maxAttempts: number;
  status: JobStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  delayUntil?: Date;
  failedReason?: string;
}

export type JobProcessor<TData> = (job: QueueJob<TData>) => Promise<void>;

export interface QueueConfig {
  name: string;
  concurrency?: number;
  defaultJobOptions?: {
    maxAttempts?: number;
    priority?: number;
  };
}

export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  concurrency: number;
}

type QueueEventMap<TData> = {
  completed: (job: QueueJob<TData>) => void;
  failed: (job: QueueJob<TData>, error: Error) => void;
  active: (job: QueueJob<TData>) => void;
  stalled: (job: QueueJob<TData>) => void;
};

export class AgentOSQueue<TData = unknown> {
  private readonly waiting: QueueJob<TData>[] = [];
  private readonly activeJobs = new Map<string, QueueJob<TData>>();
  private readonly completedJobs: QueueJob<TData>[] = [];
  private readonly failedJobs: QueueJob<TData>[] = [];
  private readonly handlers = new Map<
    string,
    Set<(...args: unknown[]) => void>
  >();
  private processor: JobProcessor<TData> | null = null;
  private running = 0;
  private draining = false;
  readonly name: string;
  private concurrency: number;

  constructor(config: QueueConfig) {
    this.name = config.name;
    this.concurrency = config.concurrency ?? 50;
  }

  add(
    name: string,
    data: TData,
    opts: { priority?: number; attempts?: number; delayMs?: number } = {},
  ): QueueJob<TData> {
    const job: QueueJob<TData> = {
      id: `${this.name}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      name,
      data,
      priority: opts.priority ?? 0,
      attempts: 0,
      maxAttempts: opts.attempts ?? 1,
      status: opts.delayMs ? "delayed" : "waiting",
      createdAt: new Date(),
      ...(opts.delayMs
        ? { delayUntil: new Date(Date.now() + opts.delayMs) }
        : {}),
    };

    this.waiting.push(job);
    this.waiting.sort((a, b) => b.priority - a.priority);

    if (!opts.delayMs) {
      setImmediate(() => this.tick());
    } else {
      setTimeout(() => {
        job.status = "waiting";
        this.tick();
      }, opts.delayMs);
    }

    return job;
  }

  addWithId(
    id: string,
    name: string,
    data: TData,
    opts: { priority?: number; attempts?: number } = {},
  ): QueueJob<TData> {
    const job: QueueJob<TData> = {
      id,
      name,
      data,
      priority: opts.priority ?? 0,
      attempts: 0,
      maxAttempts: opts.attempts ?? 1,
      status: "waiting",
      createdAt: new Date(),
    };
    this.waiting.push(job);
    this.waiting.sort((a, b) => b.priority - a.priority);
    setImmediate(() => this.tick());
    return job;
  }

  process(concurrency: number, processor: JobProcessor<TData>): void {
    this.concurrency = concurrency;
    this.processor = processor;
    this.tick();
  }

  private tick(): void {
    if (!this.processor || this.draining) return;

    while (this.running < this.concurrency && this.waiting.length > 0) {
      const job = this.waiting.find((j) => j.status === "waiting");
      if (!job) break;

      this.waiting.splice(this.waiting.indexOf(job), 1);
      job.status = "active";
      job.startedAt = new Date();
      job.attempts++;
      this.running++;
      this.activeJobs.set(job.id,
        job,  );

      this.emit("active", job);

      this.processor(job)
        .then(() => {
          this.running--;
          job.status = "completed";
          job.completedAt = new Date();
          this.activeJobs.delete(job.id);
          this.completedJobs.push(job);
          this.emit("completed", job);
          this.tick();
        })
        .catch((err: unknown) => {
          this.running--;
          this.activeJobs.delete(job.id);

          if (job.attempts < job.maxAttempts) {
            job.status = "waiting";
            this.waiting.unshift(job);
          } else {
            job.status = "failed";
            job.failedReason = err instanceof Error ? err.message : String(err);
            this.failedJobs.push(job);
            this.emit(
              "failed",
              job,
              err instanceof Error ? err : new Error(String(err)),
            );
          }
          this.tick();
        });
    }
  }

  on<K extends keyof QueueEventMap<TData>>(
    event: K,
    handler: QueueEventMap<TData>[K],
  ): () => void {
    if (!this.handlers.has(event))
      this.handlers.set(event, new Set(),
      );
    this.handlers.get(event)!.add(handler as (...args: unknown[]) => void);
    return () =>
      this.handlers.get(event)?.delete(handler as (...args: unknown[]) => void);
  }

  private emit<K extends keyof QueueEventMap<TData>>(
    event: K,
    ...args: Parameters<QueueEventMap<TData>[K]>
  ): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(...(args as unknown[]));
      } catch {
        /* silent */
      }
    }
  }

  getJob(id: string): QueueJob<TData> | undefined {
    return this.activeJobs.get(id) ?? this.waiting.find((j) => j.id === id);
  }

  drain(): Promise<void> {
    this.draining = true;
    return new Promise<void>((resolve) => {
      if (this.running === 0) {
        resolve();
        return;
      }
      const check = setInterval(() => {
        if (this.running === 0) {
          clearInterval(check);
          resolve();
        }
      }, 100);
    });
  }

  get stats(): QueueStats {
    return {
      name: this.name,
      waiting: this.waiting.filter((j) => j.status === "waiting").length,
      active: this.activeJobs.size,
      completed: this.completedJobs.length,
      failed: this.failedJobs.length,
      concurrency: this.concurrency,
    };
  }
}
