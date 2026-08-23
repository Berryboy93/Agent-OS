import { Worker } from "worker_threads";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { AgentOSError, CONCURRENCY_DEFAULTS } from "@agent-os/core";
import { CheckpointManager } from "./checkpoint-manager.js";
import { InMemoryScheduler } from "./scheduler.js";
const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKER_ENTRY = resolve(__dirname, "../dist/worker-entry.bundle.cjs");
function rawSql(db) {
    return db.session.client;
}
export class AgentRunner {
    options;
    scheduler;
    checkpoints;
    db;
    eventStore;
    maxConcurrency;
    pending = new Map();
    activeRuns = 0;
    constructor(options) {
        this.options = options;
        this.maxConcurrency =
            options.concurrencyLimit ?? CONCURRENCY_DEFAULTS.maxConcurrentRuns;
        this.db = options.db;
        this.eventStore = options.eventStore;
        this.checkpoints = new CheckpointManager(this.db);
        this.scheduler = new InMemoryScheduler("agent-os:executions", this.maxConcurrency);
        this.scheduler.process(this.maxConcurrency, async (job) => {
            await this.runWorker(job.data);
        });
        this.scheduler.on("failed", (job, err) => {
            const p = this.pending.get(job.id);
            if (p) {
                this.pending.delete(job.id);
                p.reject(err);
            }
        });
    }
    async run(input) {
        if (this.activeRuns >= this.maxConcurrency) {
            throw AgentOSError.concurrencyLimit(this.maxConcurrency, this.activeRuns);
        }
        const runId = input.runId ?? uuidv4();
        const now = Date.now();
        const sql = rawSql(this.db);
        sql
            .prepare(`
      INSERT INTO agent_runs (id, agent_id, status, input_json, created_at, started_at)
      VALUES (?, ?, 'RUNNING', ?, ?, ?)
    `)
            .run(runId, input.agentId, JSON.stringify(input.input), now, now);
        const jobData = {
            runId,
            agentId: input.agentId,
            input: input.input,
            adapterConfig: {
                provider: this.options.adapter.provider,
                model: this.options.adapter.model,
            },
            ...(input.systemPrompt !== undefined
                ? { systemPrompt: input.systemPrompt }
                : {}),
            ...(input.tokenBudget !== undefined ||
                this.options.defaultTokenBudget !== undefined
                ? { tokenBudget: input.tokenBudget ?? this.options.defaultTokenBudget }
                : {}),
            ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
        };
        return new Promise((resolve, reject) => {
            this.pending.set(runId, { resolve, reject, startedAt: now });
            this.scheduler.add("run", jobData, { priority: 0 });
        });
    }
    async runWorker(jobData) {
        this.activeRuns++;
        const sql = rawSql(this.db);
        let finalRun = null;
        const worker = new Worker(WORKER_ENTRY, {
            env: {
                ...process.env,
                NODE_PATH: "/home/r3v/Agent-OS/node_modules:/home/r3v/Agent-OS/packages/core/node_modules:/home/r3v/Agent-OS/packages/adapters/node_modules",
            },
            execArgv: ["--import", "tsx"],
            workerData: jobData,
            resourceLimits: {
                maxOldGenerationSizeMb: CONCURRENCY_DEFAULTS.workerMemoryLimitMb,
                maxYoungGenerationSizeMb: CONCURRENCY_DEFAULTS.workerYoungMemoryLimitMb,
            },
        });
        worker.on("message", (msg) => {
            if (msg.type === "event" && msg.event) {
                this.eventStore.appendSync(msg.event);
                if (this.options.onEvent)
                    this.options.onEvent(msg.event);
            }
            if (msg.type === "checkpoint" && msg.checkpoint) {
                const cp = msg.checkpoint;
                this.checkpoints.write(cp.runId, cp.agentId, cp.turnIndex, cp.messages, cp.tokenUsage, cp.agentState);
                this.eventStore.appendSync({
                    id: uuidv4(),
                    runId: cp.runId,
                    agentId: cp.agentId,
                    type: "checkpoint.created",
                    data: {
                        checkpointId: cp.id,
                        turnIndex: cp.turnIndex,
                        tokenUsage: cp.tokenUsage,
                    },
                    timestamp: new Date(),
                });
            }
            if (msg.type === "done" && msg.run) {
                finalRun = msg.run;
                const run = msg.run;
                sql
                    .prepare(`
          UPDATE agent_runs SET
            status = ?, output_json = ?, error_message = ?,
            input_tokens = ?, output_tokens = ?, total_tokens = ?, completed_at = ?
          WHERE id = ?
        `)
                    .run(run.status, run.output ? JSON.stringify(run.output) : null, run.error ?? null, run.tokenUsage?.inputTokens ?? 0, run.tokenUsage?.outputTokens ?? 0, run.tokenUsage?.totalTokens ?? 0, run.completedAt ? run.completedAt.getTime() : null, run.id);
            }
            if (msg.type === "error") {
                sql
                    .prepare(`UPDATE agent_runs SET status='FAILED', error_message=?, completed_at=? WHERE id=?`)
                    .run(msg.error, Date.now(), jobData.runId);
            }
        });
        await new Promise((resolve, reject) => {
            worker.on("exit", (code) => {
                this.activeRuns--;
                this.eventStore.clearRun(jobData.runId);
                const p = this.pending.get(jobData.runId);
                if (p && finalRun) {
                    this.pending.delete(jobData.runId);
                    const run = finalRun;
                    p.resolve({
                        runId: run.id,
                        agentId: run.agentId,
                        status: run.status,
                        ...(run.output !== undefined ? { output: run.output } : {}),
                        ...(run.error !== undefined ? { error: run.error } : {}),
                        tokenUsage: run.tokenUsage ?? {
                            inputTokens: 0,
                            outputTokens: 0,
                            totalTokens: 0,
                        },
                        durationMs: run.completedAt && run.startedAt
                            ? run.completedAt.getTime() - run.startedAt.getTime()
                            : 0,
                    });
                    resolve();
                }
                else if (p) {
                    this.pending.delete(jobData.runId);
                    const err = new Error(`Worker exited with code ${code} without sending done`);
                    p.reject(err);
                    reject(err);
                }
                else {
                    if (code === 0)
                        resolve();
                    else
                        reject(new Error(`Worker exited with code ${code}`));
                }
            });
            worker.on("error", (err) => {
                this.activeRuns--;
                sql
                    .prepare(`UPDATE agent_runs SET status='FAILED', error_message=?, completed_at=? WHERE id=?`)
                    .run(err.message, Date.now(), jobData.runId);
                const p = this.pending.get(jobData.runId);
                if (p) {
                    this.pending.delete(jobData.runId);
                    p.reject(err);
                }
                reject(err);
            });
        });
    }
    async recoverCrashedRuns() {
        const recoverable = this.checkpoints.loadRecoverableRuns();
        let count = 0;
        for (const { runId, agentId, inputJson } of recoverable) {
            const checkpoint = this.checkpoints.loadLatest(runId);
            this.checkpoints.markResuming(runId);
            const input = JSON.parse(inputJson);
            const jobData = {
                runId,
                agentId,
                input,
                adapterConfig: {
                    provider: this.options.adapter.provider,
                    model: this.options.adapter.model,
                },
                ...(checkpoint !== null ? { checkpoint } : {}),
            };
            this.scheduler.add("recover", jobData, { priority: 10 });
            count++;
            this.eventStore.appendSync({
                id: uuidv4(),
                runId,
                agentId,
                type: "run.resuming",
                data: {
                    fromCheckpoint: checkpoint?.id,
                    fromTurn: checkpoint?.turnIndex ?? 0,
                    recoveryAt: new Date().toISOString(),
                },
                timestamp: new Date(),
            });
        }
        return count;
    }
    get stats() {
        return {
            activeRuns: this.activeRuns,
            maxConcurrency: this.maxConcurrency,
            pendingCount: this.pending.size,
            scheduler: this.scheduler.stats,
        };
    }
}
//# sourceMappingURL=agent-runner.js.map