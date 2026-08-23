import { workerData, parentPort } from 'worker_threads';
import { v4 as uuidv4 } from 'uuid';
import { AgentOSError, MAX_TURNS } from '@agent-os/core';
import { TokenTracker } from './token-tracker.js';
if (!parentPort) {
    throw new Error('worker-entry must be run as a Worker thread');
}
const port = parentPort;
const job = workerData;
function sendEvent(event) {
    const msg = { type: 'event', event };
    port.postMessage(msg);
}
function sendCheckpoint(checkpoint) {
    const msg = { type: 'checkpoint', checkpoint };
    port.postMessage(msg);
}
function sendDone(run) {
    const msg = { type: 'done', run };
    port.postMessage(msg);
}
function sendError(error) {
    const msg = { type: 'error', error };
    port.postMessage(msg);
}
async function buildAdapter(config) {
    const { AnthropicAdapter } = await import('@agent-os/adapters');
    if (config.provider === 'anthropic') {
        return new AnthropicAdapter({
            apiKey: config.apiKey ?? process.env['ANTHROPIC_API_KEY'],
            model: config.model,
            maxTokens: config.maxTokens,
            temperature: config.temperature,
        });
    }
    if (config.provider === 'openai' || config.provider === 'local') {
        const { OpenAIAdapter } = await import('@agent-os/adapters');
        return new OpenAIAdapter({
            apiKey: config.apiKey ?? process.env['OPENAI_API_KEY'],
            model: config.model,
            baseURL: config.baseURL,
            maxTokens: config.maxTokens,
            temperature: config.temperature,
        });
    }
    throw AgentOSError.adapterError(config.provider, `Unknown provider: ${config.provider}`);
}
async function run() {
    const { runId, agentId, input, systemPrompt, adapterConfig, tokenBudget, checkpoint } = job;
    const tracker = new TokenTracker(tokenBudget);
    let messages = [];
    let startTurn = 0;
    if (checkpoint) {
        messages = checkpoint.messages;
        startTurn = checkpoint.turnIndex + 1;
        tracker.restore(checkpoint.tokenUsage);
        sendEvent({
            id: uuidv4(), runId, agentId, type: 'run.resuming',
            data: { fromTurn: startTurn, checkpoint: checkpoint.id },
            timestamp: new Date(),
        });
    }
    else {
        messages = [{ role: 'user', content: JSON.stringify(input) }];
        sendEvent({
            id: uuidv4(), runId, agentId, type: 'run.started',
            data: { input },
            timestamp: new Date(),
        });
    }
    let adapter;
    try {
        adapter = await buildAdapter(adapterConfig);
    }
    catch (err) {
        sendError(err instanceof Error ? err.message : String(err));
        return;
    }
    const currentRun = {
        id: runId,
        agentId,
        status: 'RUNNING',
        input,
        createdAt: new Date(),
        startedAt: new Date(),
        tokenUsage: tracker.usage,
    };
    try {
        for (let turn = startTurn; turn < MAX_TURNS; turn++) {
            sendEvent({
                id: uuidv4(), runId, agentId, type: 'turn.started',
                data: { turn },
                timestamp: new Date(),
            });
            const result = await adapter.run(messages, { systemPrompt });
            const budgetStatus = tracker.accumulate(result.usage);
            sendEvent({
                id: uuidv4(), runId, agentId, type: 'token.usage',
                data: { usage: result.usage, cumulative: tracker.usage, turn },
                timestamp: new Date(),
            });
            if (budgetStatus === 'warning') {
                sendEvent({
                    id: uuidv4(), runId, agentId, type: 'budget.warning',
                    data: { usage: tracker.usage },
                    timestamp: new Date(),
                });
            }
            sendEvent({
                id: uuidv4(), runId, agentId, type: 'turn.completed',
                data: { turn, stopReason: result.stopReason, contentLength: result.content.length },
                timestamp: new Date(),
            });
            const cpMessages = [...messages, { role: 'assistant', content: result.content }];
            const cp = {
                id: uuidv4(),
                runId, agentId,
                turnIndex: turn,
                messages: cpMessages,
                tokenUsage: tracker.usage,
                createdAt: new Date(),
            };
            sendCheckpoint(cp);
            sendEvent({
                id: uuidv4(), runId, agentId, type: 'checkpoint.created',
                data: { checkpointId: cp.id, turn },
                timestamp: new Date(),
            });
            if (result.stopReason === 'end_turn' || result.toolCalls.length === 0) {
                currentRun.status = 'COMPLETED';
                currentRun.output = { content: result.content };
                currentRun.tokenUsage = tracker.usage;
                currentRun.completedAt = new Date();
                currentRun.checkpointId = cp.id;
                sendEvent({
                    id: uuidv4(), runId, agentId, type: 'run.completed',
                    data: { output: currentRun.output, tokenUsage: tracker.usage },
                    timestamp: new Date(),
                });
                sendDone(currentRun);
                return;
            }
            messages.push({ role: 'assistant', content: result.content, toolCalls: result.toolCalls });
            for (const tc of result.toolCalls) {
                sendEvent({
                    id: uuidv4(), runId, agentId, type: 'tool.called',
                    data: { toolName: tc.name, input: tc.input },
                    timestamp: new Date(),
                });
                messages.push({
                    role: 'tool',
                    content: JSON.stringify({ error: 'Tool execution happens in main thread' }),
                    toolCallId: tc.id,
                });
                sendEvent({
                    id: uuidv4(), runId, agentId, type: 'tool.result',
                    data: { toolName: tc.name, success: false, note: 'tool_dispatch_pending' },
                    timestamp: new Date(),
                });
            }
        }
        currentRun.status = 'FAILED';
        currentRun.error = `Exceeded maximum turns (${MAX_TURNS})`;
        currentRun.tokenUsage = tracker.usage;
        currentRun.completedAt = new Date();
        sendEvent({
            id: uuidv4(), runId, agentId, type: 'run.failed',
            data: { error: currentRun.error, code: 'MAX_ITERATIONS_EXCEEDED' },
            timestamp: new Date(),
        });
        sendDone(currentRun);
    }
    catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        const isBudget = err instanceof AgentOSError && err.agentError.code === 'BUDGET_EXCEEDED';
        const isCancelled = err instanceof AgentOSError && err.agentError.code === 'CANCELLATION';
        currentRun.status = isCancelled ? 'CANCELLED' : 'FAILED';
        currentRun.error = error;
        currentRun.tokenUsage = tracker.usage;
        currentRun.completedAt = new Date();
        sendEvent({
            id: uuidv4(), runId, agentId,
            type: isBudget ? 'budget.exceeded' : isCancelled ? 'run.cancelled' : 'run.failed',
            data: { error, usage: tracker.usage },
            timestamp: new Date(),
        });
        sendDone(currentRun);
    }
}
run().catch((err) => {
    sendError(err instanceof Error ? err.message : String(err));
});
//# sourceMappingURL=worker-entry.js.map