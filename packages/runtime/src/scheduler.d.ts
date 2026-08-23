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
export declare class InMemoryScheduler {
    private readonly name;
    private readonly queue;
    private readonly activeJobs;
    private readonly handlers;
    private processor;
    private concurrency;
    private running;
    private draining;
    constructor(name: string, concurrency?: number);
    add(name: string, data: WorkerJobData, opts?: {
        priority?: number;
        attempts?: number;
    }): Job;
    process(concurrency: number, processor: JobProcessor): void;
    private tick;
    on<K extends keyof QueueEvents>(event: K, handler: QueueEvents[K]): () => void;
    private emit;
    get stats(): {
        name: string;
        waiting: number;
        active: number;
        concurrency: number;
    };
    drain(): void;
}
export {};
//# sourceMappingURL=scheduler.d.ts.map