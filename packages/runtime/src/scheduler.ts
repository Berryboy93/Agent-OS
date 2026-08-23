import type { WorkerJobData } from "@agent-os/core";

export interface Job {
  id: string;
  name: string;
  data: WorkerJobData;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  startedAt?: Date;
}

type JobProcessor = (job: Job) => Promise<void>;

interface QueueEvents {
  completed: (job: Job) => void;
  failed: (job: Job, error: Error) => void;
  active: (job: Job) => void;
}

export class InMemoryScheduler {
  private readonly queue: Job[] = [];
  private readonly activeJobs = new Map<string, Job>();
  private readonly handlers = new Map<
    keyof QueueEvents,
    Set<(...args: unknown[]) => void>
  >();
  private processor: JobProcessor | null = null;
  private concurrency: number;
  private running = 0;
  private draining = false;

  constructor(
    private readonly name: string,
    concurrency = 50,
  ) {
    this.concurrency = concurrency;
  }

  add(
    name: string,
    data: WorkerJobData,
    opts: { priority?: number; attempts?: number } = {},
  ): Job {
    const job: Job = {
      id: data.runId,
      name,
      data,
      priority: opts.priority ?? 0,
      attempts: 0,
      maxAttempts: opts.attempts ?? 1,
      createdAt: new Date(),
    };
    this.queue.push(job);
    this.queue.sort((a, b) => b.priority - a.priority);
    setImmediate(() => this.tick());
    return job;
  }

  process(concurrency: number, processor: JobProcessor): void {
    this.concurrency = concurrency;
    this.processor = processor;
    this.tick();
  }

  private tick(): void {
    if (!this.processor || this.draining) return;

    while (this.running < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) break;

      job.startedAt = new Date();
      job.attempts++;
      this.running++;
      this.activeJobs.set(job.id,
        job,  );

      this.emit("active", job);

      this.processor(job)
        .then(() => {
          this.running--;
          this.activeJobs.delete(job.id);
          this.emit("completed", job);
          this.tick();
        })
        .catch((err: unknown) => {
          this.running--;
          this.activeJobs.delete(job.id);

          if (job.attempts < job.maxAttempts) {
            this.queue.unshift(job);
          } else {
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

  on<K extends keyof QueueEvents>(
    event: K,
    handler: QueueEvents[K],
  ): () => void {
    if (!this.handlers.has(event))
      this.handlers.set(event, new Set(),
      );
    this.handlers.get(event)!.add(handler as (...args: unknown[]) => void);
    return () =>
      this.handlers.get(event)?.delete(handler as (...args: unknown[]) => void);
  }

  private emit<K extends keyof QueueEvents>(
    event: K,
    ...args: Parameters<QueueEvents[K]>
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

  get stats() {
    return {
      name: this.name,
      waiting: this.queue.length,
      active: this.activeJobs.size,
      concurrency: this.concurrency,
    };
  }

  drain(): void {
    this.draining = true;
  }
}
