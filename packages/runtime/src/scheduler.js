export class InMemoryScheduler {
    name;
    queue = [];
    activeJobs = new Map();
    handlers = new Map();
    processor = null;
    concurrency;
    running = 0;
    draining = false;
    constructor(name, concurrency = 50) {
        this.name = name;
        this.concurrency = concurrency;
    }
    add(name, data, opts = {}) {
        const job = {
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
    process(concurrency, processor) {
        this.concurrency = concurrency;
        this.processor = processor;
        this.tick();
    }
    tick() {
        if (!this.processor || this.draining)
            return;
        while (this.running < this.concurrency && this.queue.length > 0) {
            const job = this.queue.shift();
            if (!job)
                break;
            job.startedAt = new Date();
            job.attempts++;
            this.running++;
            this.activeJobs.set(job.id, job);
            this.emit("active", job);
            this.processor(job)
                .then(() => {
                this.running--;
                this.activeJobs.delete(job.id);
                this.emit("completed", job);
                this.tick();
            })
                .catch((err) => {
                this.running--;
                this.activeJobs.delete(job.id);
                if (job.attempts < job.maxAttempts) {
                    this.queue.unshift(job);
                }
                else {
                    this.emit("failed", job, err instanceof Error ? err : new Error(String(err)));
                }
                this.tick();
            });
        }
    }
    on(event, handler) {
        if (!this.handlers.has(event))
            this.handlers.set(event, new Set());
        this.handlers.get(event).add(handler);
        return () => this.handlers.get(event)?.delete(handler);
    }
    emit(event, ...args) {
        const set = this.handlers.get(event);
        if (!set)
            return;
        for (const handler of set) {
            try {
                handler(...args);
            }
            catch {
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
    drain() {
        this.draining = true;
    }
}
//# sourceMappingURL=scheduler.js.map