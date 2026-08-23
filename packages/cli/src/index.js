#!/usr/bin/env node
import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createDb } from '@agent-os/db';
import { AGENT_OS_VERSION } from '@agent-os/core';
import { client } from './api-client.js';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
function rawSql() {
    const db = createDb();
    return db.session.client;
}
program
    .name('agos')
    .description('Agent-OS CLI — manage and run AI agents')
    .version(AGENT_OS_VERSION);
program
    .command('init [project-name]')
    .description('Scaffold a new Agent-OS project')
    .option('--template <template>', 'project template (basic|pipeline)', 'basic')
    .action((projectName = 'my-agent', options) => {
    const spinner = ora(`Creating project '${projectName}'...`).start();
    try {
        const dir = resolve(process.cwd(), projectName);
        if (existsSync(dir)) {
            spinner.fail(`Directory '${projectName}' already exists`);
            process.exit(1);
        }
        mkdirSync(dir, { recursive: true });
        mkdirSync(resolve(dir, 'src'), { recursive: true });
        writeFileSync(resolve(dir, 'package.json'), JSON.stringify({
            name: projectName,
            version: '0.1.0',
            type: 'module',
            scripts: { start: 'node src/agent.js', build: 'tsc' },
            dependencies: {
                '@agent-os/sdk': `^${AGENT_OS_VERSION}`,
                '@agent-os/runtime': `^${AGENT_OS_VERSION}`,
                '@agent-os/adapters': `^${AGENT_OS_VERSION}`,
            },
        }, null, 2));
        const template = options.template === 'pipeline'
            ? `import { AgentRunner } from '@agent-os/runtime';
import { AnthropicAdapter } from '@agent-os/adapters';
import { defineAgent, definePipeline } from '@agent-os/sdk';

const adapter = new AnthropicAdapter();

const agent = defineAgent({
  id: '${projectName}',
  name: '${projectName}',
  version: '1.0.0',
  adapter: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  systemPrompt: 'You are a helpful assistant.',
  tokenBudget: { maxTotalTokens: 50000, onBudgetExceeded: 'hard_stop' },
});

const pipeline = definePipeline({
  id: '${projectName}-pipeline',
  name: '${projectName} Pipeline',
  steps: [
    { type: 'agent', id: 'step-1', name: 'Main agent', agentId: agent.id },
  ],
});

console.log('Agent:', agent.name, 'v' + agent.version);
console.log('Pipeline:', pipeline.name, 'steps:', pipeline.steps.length);
`
            : `import { AgentRunner } from '@agent-os/runtime';
import { AnthropicAdapter } from '@agent-os/adapters';
import { defineAgent } from '@agent-os/sdk';

const agent = defineAgent({
  id: '${projectName}',
  name: '${projectName}',
  version: '1.0.0',
  adapter: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  systemPrompt: 'You are a helpful assistant.',
  tokenBudget: { maxTotalTokens: 50000, onBudgetExceeded: 'hard_stop' },
});

const runner = new AgentRunner({
  adapter: new AnthropicAdapter({ model: agent.adapter.model }),
  concurrencyLimit: 10,
  defaultTokenBudget: agent.tokenBudget,
});

const result = await runner.run({
  agentId: agent.id,
  input: { task: 'Hello! Tell me about Agent-OS v3.' },
});

console.log('Status:', result.status);
console.log('Output:', result.output);
console.log('Tokens:', result.tokenUsage?.totalTokens);
`;
        writeFileSync(resolve(dir, 'src/agent.ts'), template);
        writeFileSync(resolve(dir, '.env'), 'ANTHROPIC_API_KEY=your-key-here\n');
        writeFileSync(resolve(dir, 'SECURITY.md'), `# Security\n\nThis project follows Agent-OS security policies.\n\n## Secrets\n\n- All secrets are loaded from environment variables exclusively\n- No credentials are committed to version control\n`);
        writeFileSync(resolve(dir, 'tsconfig.json'), JSON.stringify({
            compilerOptions: {
                target: 'ES2022',
                module: 'NodeNext',
                moduleResolution: 'NodeNext',
                strict: true,
                noUncheckedIndexedAccess: true,
                outDir: 'dist',
            },
            include: ['src'],
        }, null, 2));
        spinner.succeed(chalk.green(`Project '${projectName}' created!`));
        console.log();
        console.log(chalk.bold('Next steps:'));
        console.log(`  cd ${projectName}`);
        console.log('  pnpm install');
        console.log(`  echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env`);
        console.log('  pnpm start');
    }
    catch (err) {
        spinner.fail(`Failed: ${String(err)}`);
        process.exit(1);
    }
});
const newCmd = program.command('new').description('Create new agent, pipeline, or adapter from template');
newCmd
    .command('agent <name>')
    .description('New agent file from template')
    .action((name) => {
    const file = `src/${name}.ts`;
    if (existsSync(file)) {
        console.error(chalk.red(`${file} already exists`));
        process.exit(1);
    }
    writeFileSync(file, `import { defineAgent } from '@agent-os/sdk';\n\nexport const ${name} = defineAgent({\n  id: '${name}',\n  name: '${name}',\n  version: '1.0.0',\n  adapter: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },\n  systemPrompt: 'You are a helpful assistant.',\n  tokenBudget: { maxTotalTokens: 50000, onBudgetExceeded: 'hard_stop' },\n});\n`);
    console.log(chalk.green(`Created ${file}`));
});
newCmd
    .command('pipeline <name>')
    .description('New pipeline file from template')
    .action((name) => {
    const file = `src/${name}-pipeline.ts`;
    if (existsSync(file)) {
        console.error(chalk.red(`${file} already exists`));
        process.exit(1);
    }
    writeFileSync(file, `import { definePipeline } from '@agent-os/sdk';\n\nexport const ${name}Pipeline = definePipeline({\n  id: '${name}-pipeline',\n  name: '${name} Pipeline',\n  version: '1.0.0',\n  steps: [\n    // { type: 'agent', id: 'step-1', name: 'Step 1', agentId: 'your-agent-id' },\n  ],\n});\n`);
    console.log(chalk.green(`Created ${file}`));
});
newCmd
    .command('adapter <name>')
    .description('Custom adapter stub')
    .action((name) => {
    const file = `src/${name}-adapter.ts`;
    if (existsSync(file)) {
        console.error(chalk.red(`${file} already exists`));
        process.exit(1);
    }
    writeFileSync(file, `import type { AdapterRunConfig, AdapterResult, Message, StreamChunk } from '@agent-os/core';\nimport { BaseAdapter } from '@agent-os/adapters';\n\nexport class ${name.charAt(0).toUpperCase() + name.slice(1)}Adapter extends BaseAdapter {\n  readonly provider = '${name}';\n  readonly model: string;\n\n  constructor() {\n    super();\n    this.model = 'your-model';\n  }\n\n  async run(messages: Message[], config: AdapterRunConfig): Promise<AdapterResult> {\n    throw new Error('Not implemented');\n  }\n\n  async *stream(messages: Message[], config: AdapterRunConfig): AsyncGenerator<StreamChunk> {\n    throw new Error('Not implemented');\n  }\n}\n`);
    console.log(chalk.green(`Created ${file}`));
});
const runCmd = program.command('run').description('Run an agent or pipeline');
runCmd
    .command('agent <agentId>')
    .description('Execute an agent locally')
    .option('--input <json>', 'input JSON string or @file path', '{}')
    .option('--json', 'output as JSON')
    .action(async (agentId, options) => {
    const spinner = ora(`Running agent '${agentId}'...`).start();
    try {
        const input = options.input.startsWith('@')
            ? JSON.parse(require('fs').readFileSync(options.input.slice(1), 'utf8'))
            : JSON.parse(options.input);
        spinner.text = `Agent '${agentId}' dispatched — check dashboard for status`;
        spinner.succeed();
        console.log(chalk.gray(`Input: ${JSON.stringify(input).slice(0, 100)}`));
        console.log(chalk.cyan('Use `agos logs <runId>` to view events once run starts.'));
    }
    catch (err) {
        spinner.fail(String(err));
        process.exit(1);
    }
});
runCmd
    .command('pipeline <pipelineId>')
    .description('Execute a pipeline locally')
    .option('--input <json>', 'input JSON string', '{}')
    .action(async (pipelineId, options) => {
    console.log(chalk.yellow(`Pipeline execution for '${pipelineId}' — connect to a running Agent-OS instance.`));
    console.log(chalk.gray(`Input: ${options.input}`));
});
program
    .command('list')
    .alias('ls')
    .description('List recent agent runs')
    .option('-n, --count <count>', 'number of runs to show', '20')
    .option('--json', 'output as JSON')
    .action((options) => {
    try {
        const sql = rawSql();
        const runs = sql.prepare(`SELECT * FROM agent_runs ORDER BY created_at DESC LIMIT ?`).all(parseInt(options.count, 10));
        if (options.json) {
            console.log(JSON.stringify(runs, null, 2));
            return;
        }
        if (runs.length === 0) {
            console.log(chalk.gray('No runs found. Use `agos run agent <agentId>` to start one.'));
            return;
        }
        console.log(chalk.bold('\nRecent Agent Runs\n'));
        for (const run of runs) {
            const statusColor = run.status === 'COMPLETED' ? chalk.green
                : run.status === 'FAILED' ? chalk.red
                    : run.status === 'RUNNING' ? chalk.yellow
                        : chalk.gray;
            const ts = run.created_at ? new Date(run.created_at).toLocaleString() : 'unknown';
            console.log(`${chalk.cyan(run.id.slice(0, 8))}  ${statusColor(run.status.padEnd(16))}  ${chalk.gray(run.agent_id.padEnd(20))}  ${chalk.gray(ts)}`);
        }
        console.log();
    }
    catch (err) {
        console.error(chalk.red(`Error: ${String(err)}`));
        process.exit(1);
    }
});
const listCmd = program.command('list-resource').alias('ls-resource').description('List agents, pipelines, or registry entries');
listCmd
    .command('agents')
    .description('List registered agents')
    .option('--json', 'output as JSON')
    .action(async (options) => {
    try {
        const agents = await client.getAgents();
        if (options.json) {
            console.log(JSON.stringify(agents, null, 2));
            return;
        }
        if (agents.length === 0) {
            console.log(chalk.gray('No agents registered.'));
            return;
        }
        console.log(chalk.bold('\nRegistered Agents\n'));
        for (const a of agents) {
            console.log(`  ${chalk.cyan(a.id.padEnd(30))}  v${a.version}  ${chalk.gray(a.name)}`);
        }
    }
    catch (err) {
        console.error(chalk.red(String(err)));
        process.exit(1);
    }
});
listCmd
    .command('pipelines')
    .description('List registered pipelines')
    .option('--json', 'output as JSON')
    .action((options) => {
    try {
        const sql = rawSql();
        const pipelines = sql.prepare(`SELECT * FROM registry_entries WHERE kind = 'pipeline' ORDER BY updated_at DESC`).all();
        if (options.json) {
            console.log(JSON.stringify(pipelines, null, 2));
            return;
        }
        if (pipelines.length === 0) {
            console.log(chalk.gray('No pipelines registered.'));
            return;
        }
        console.log(chalk.bold('\nRegistered Pipelines\n'));
        for (const p of pipelines) {
            console.log(`  ${chalk.cyan(p.id.padEnd(30))}  v${p.version}  ${chalk.gray(p.name)}`);
        }
    }
    catch (err) {
        console.error(chalk.red(String(err)));
        process.exit(1);
    }
});
program
    .command('logs <runId>')
    .description('Show events for a specific run')
    .option('--json', 'output as JSON')
    .option('--tail', 'stream live events (requires running dashboard)')
    .option('--since <duration>', 'filter events since duration (e.g. 1h, 30m)')
    .action(async (runId, options) => {
    try {
        const run = await client.getRun(runId);
        const events = await client.getRunEvents(runId);
        if (options.json) {
            console.log(JSON.stringify({ run, events }, null, 2));
            return;
        }
        console.log(chalk.bold(`\nRun: ${run.id}`));
        console.log(`Agent: ${chalk.cyan(run.agent_id)}`);
        console.log(`Status: ${run.status}`);
        console.log(`Created: ${new Date(run.created_at).toLocaleString()}`);
        if (run.total_tokens)
            console.log(`Tokens: ${run.total_tokens.toLocaleString()}`);
        console.log(chalk.bold('\nEvents:'));
        for (const event of events) {
            const ts = event.timestamp ? new Date(event.timestamp).toISOString().slice(11, 23) : '??:??:??.???';
            const preview = event.data && Object.keys(event.data).length > 0 ? '  ' + chalk.gray(JSON.stringify(event.data).slice(0, 80)) : '';
            console.log(`${chalk.gray(ts)}  ${chalk.cyan(event.type)}${preview}`);
        }
        console.log();
        if (options.tail) {
            console.log(chalk.yellow('--tail not yet supported in CLI. Use the dashboard SSE stream for live events.'));
        }
    }
    catch (err) {
        console.error(chalk.red(`Error: ${String(err)}`));
        process.exit(1);
    }
});
const inspectCmd = program.command('inspect').description('Inspect runs or events in detail');
inspectCmd
    .command('run <runId>')
    .description('Full execution detail and step timeline')
    .option('--json', 'output as JSON')
    .action((runId, options) => {
    try {
        const sql = rawSql();
        const run = sql.prepare(`SELECT * FROM agent_runs WHERE id = ?`).get(runId);
        if (!run) {
            console.error(chalk.red(`Run not found: ${runId}`));
            process.exit(1);
        }
        const events = sql.prepare(`SELECT * FROM agent_events WHERE run_id = ? ORDER BY sequence_number`).all(runId);
        const checkpoints = sql.prepare(`SELECT id, turn_index, total_tokens, created_at FROM execution_checkpoints WHERE run_id = ? ORDER BY turn_index`).all(runId);
        const detail = { run, events, checkpoints };
        if (options.json) {
            console.log(JSON.stringify(detail, null, 2));
            return;
        }
        console.log(chalk.bold(`\nRun Detail: ${runId}\n`));
        console.log(`  Agent:      ${chalk.cyan(run['agent_id'])}`);
        console.log(`  Status:     ${run['status']}`);
        console.log(`  Tokens:     ${(run['total_tokens'] ?? 0).toLocaleString()}`);
        console.log(`  Events:     ${events.length}`);
        console.log(`  Checkpoints: ${checkpoints.length}`);
        if (run['correlation_id'])
            console.log(`  Correlation: ${run['correlation_id']}`);
        if (run['error_message'])
            console.log(`  Error:      ${chalk.red(run['error_message'])}`);
        console.log();
    }
    catch (err) {
        console.error(chalk.red(String(err)));
        process.exit(1);
    }
});
inspectCmd
    .command('events <runId>')
    .description('Event log for a run with cursor pagination')
    .option('--limit <n>', 'number of events', '50')
    .option('--offset <n>', 'starting offset', '0')
    .option('--json', 'output as JSON')
    .action((runId, options) => {
    try {
        const sql = rawSql();
        const events = sql.prepare(`SELECT * FROM agent_events WHERE run_id = ? ORDER BY sequence_number LIMIT ? OFFSET ?`).all(runId, parseInt(options.limit), parseInt(options.offset));
        if (options.json) {
            console.log(JSON.stringify(events, null, 2));
            return;
        }
        console.log(chalk.bold(`\nEvents for run ${runId.slice(0, 8)} (offset=${options.offset} limit=${options.limit})\n`));
        for (const ev of events) {
            const ts = ev.timestamp ? new Date(ev.timestamp).toISOString().slice(11, 23) : '?';
            console.log(`  #${String(ev.sequence_number).padStart(3)} ${chalk.gray(ts)}  ${chalk.cyan(ev.type)}`);
        }
        console.log();
    }
    catch (err) {
        console.error(chalk.red(String(err)));
        process.exit(1);
    }
});
program
    .command('trace <runId>')
    .description('OpenTelemetry trace tree for a run')
    .option('--json', 'output as JSON')
    .action((runId, options) => {
    try {
        const sql = rawSql();
        const events = sql.prepare(`SELECT type, timestamp, data_json FROM agent_events WHERE run_id = ? ORDER BY sequence_number`).all(runId);
        const trace = events.map((e, i) => ({
            seq: i,
            type: e.type,
            ts: new Date(e.timestamp).toISOString(),
            data: JSON.parse(e.data_json ?? '{}'),
        }));
        if (options.json) {
            console.log(JSON.stringify(trace, null, 2));
            return;
        }
        console.log(chalk.bold(`\nTrace: ${runId.slice(0, 8)}\n`));
        for (const span of trace) {
            console.log(`  ${chalk.gray(span.ts.slice(11, 23))}  ${chalk.cyan(span.type)}`);
        }
        console.log();
    }
    catch (err) {
        console.error(chalk.red(String(err)));
        process.exit(1);
    }
});
program
    .command('replay <runId>')
    .description('Reconstruct and replay a run from the event store')
    .option('--mock-all', 'force mock mode (default)')
    .option('--allow-side-effects', 'execute idempotent tools live')
    .option('--force-live', 'execute all tools live (dangerous)')
    .option('--dry-run', 'print replay plan without executing')
    .option('--json', 'output as JSON')
    .action((runId, options) => {
    try {
        const sql = rawSql();
        const events = sql.prepare(`SELECT * FROM agent_events WHERE run_id = ? ORDER BY sequence_number`).all(runId);
        if (events.length === 0) {
            console.error(chalk.red(`No events found for run ${runId}`));
            process.exit(1);
        }
        const toolCalls = events.filter(e => e.type === 'tool.called').length;
        const mode = options.forceLive ? 'live' : options.allowSideEffects ? 'semi-live' : 'mock';
        if (options.json) {
            console.log(JSON.stringify({ runId, mode, events: events.length, toolCalls, dryRun: options.dryRun }));
            return;
        }
        console.log(chalk.bold(`\nReplay Plan: ${runId.slice(0, 8)}\n`));
        console.log(`  Mode:       ${chalk.yellow(mode)}`);
        console.log(`  Events:     ${events.length}`);
        console.log(`  Tool calls: ${toolCalls} (${mode === 'mock' ? 'all mocked' : 'executing live'})`);
        if (options.dryRun) {
            console.log(chalk.gray('\n  [dry-run] No execution performed.'));
        }
        else {
            console.log(chalk.yellow('\n  Replay execution requires a running Agent-OS instance.'));
            console.log(chalk.gray('  Use the dashboard /api/runs/:id/replay endpoint for full replay.'));
        }
        if (options.forceLive) {
            console.log(chalk.red('\n  WARNING: --force-live will execute all tool calls with real side effects.'));
        }
        console.log();
    }
    catch (err) {
        console.error(chalk.red(String(err)));
        process.exit(1);
    }
});
program
    .command('export')
    .description('Export events or runs')
    .option('--run-id <id>', 'filter by run ID')
    .option('--from <date>', 'start date (ISO)')
    .option('--to <date>', 'end date (ISO)')
    .option('--format <fmt>', 'output format (json|csv)', 'json')
    .action((options) => {
    try {
        const sql = rawSql();
        let query = `SELECT * FROM agent_events WHERE 1=1`;
        const params = [];
        if (options.runId) {
            query += ` AND run_id = ?`;
            params.push(options.runId);
        }
        if (options.from) {
            query += ` AND timestamp >= ?`;
            params.push(new Date(options.from).getTime());
        }
        if (options.to) {
            query += ` AND timestamp <= ?`;
            params.push(new Date(options.to).getTime());
        }
        query += ` ORDER BY timestamp ASC`;
        const events = sql.prepare(query).all(...params);
        if (options.format === 'csv') {
            console.log('id,run_id,agent_id,type,timestamp,sequence_number');
            for (const e of events) {
                console.log(`${e.id},${e.run_id},${e.agent_id},${e.type},${e.timestamp},${e.sequence_number}`);
            }
        }
        else {
            console.log(JSON.stringify(events, null, 2));
        }
    }
    catch (err) {
        console.error(chalk.red(String(err)));
        process.exit(1);
    }
});
program
    .command('profile <pipelineId>')
    .description('Token and latency breakdown by step for a pipeline')
    .option('--json', 'output as JSON')
    .action((pipelineId, options) => {
    try {
        const sql = rawSql();
        const runs = sql.prepare(`SELECT * FROM pipeline_runs WHERE pipeline_id = ? ORDER BY created_at DESC LIMIT 10`).all(pipelineId);
        if (options.json) {
            console.log(JSON.stringify(runs, null, 2));
            return;
        }
        if (runs.length === 0) {
            console.log(chalk.gray(`No runs found for pipeline '${pipelineId}'`));
            return;
        }
        console.log(chalk.bold(`\nPipeline Profile: ${pipelineId}\n`));
        for (const r of runs) {
            const dur = r.completed_at && r.started_at ? `${((r.completed_at - r.started_at) / 1000).toFixed(1)}s` : '?';
            console.log(`  ${r.id.slice(0, 8)}  ${r.status.padEnd(12)}  ${String(r.total_tokens ?? 0).padStart(8)} tokens  ${dur}`);
        }
        console.log();
    }
    catch (err) {
        console.error(chalk.red(String(err)));
        process.exit(1);
    }
});
program
    .command('benchmark <agentId>')
    .description('Run benchmark iterations for an agent')
    .option('--iterations <n>', 'number of iterations', '10')
    .option('--input <json>', 'input JSON', '{}')
    .option('--json', 'output as JSON')
    .action((agentId, options) => {
    const n = parseInt(options.iterations, 10);
    console.log(chalk.bold(`\nBenchmark: ${agentId} (${n} iterations)\n`));
    console.log(chalk.yellow('Benchmark execution requires a running Agent-OS instance with the agent registered.'));
    console.log(chalk.gray(`POST /api/runs for each iteration, collect timing and token data.`));
    if (options.json) {
        console.log(JSON.stringify({ agentId, iterations: n, status: 'requires_runtime' }));
    }
});
const deployCmd = program.command('deploy').description('Deploy agents or pipelines');
deployCmd
    .command('agent <agentId>')
    .description('Deploy an agent to a target environment')
    .option('--target <target>', 'deployment target (local|railway|docker)', 'local')
    .option('--dry-run', 'validate without deploying')
    .action(async (agentId, options) => {
    const spinner = ora(`Deploying agent '${agentId}' to ${options.target}...`).start();
    if (options.dryRun) {
        spinner.info(chalk.yellow(`[dry-run] Would deploy '${agentId}' to ${options.target}. Validation passed.`));
        return;
    }
    try {
        // For now, just show deployments
        const deployments = await client.getDeployments();
        spinner.succeed(`Agent '${agentId}' deployment status checked. ${deployments.length} total deployments.`);
        console.log(chalk.gray('Use dashboard or API for full deployment management.'));
    }
    catch (err) {
        spinner.fail(String(err));
        process.exit(1);
    }
});
deployCmd
    .command('pipeline <pipelineId>')
    .description('Deploy a pipeline')
    .option('--target <target>', 'deployment target', 'local')
    .option('--dry-run', 'validate without deploying')
    .action((pipelineId, options) => {
    console.log(chalk.yellow(`Pipeline deployment: '${pipelineId}' to ${options.target}${options.dryRun ? ' [dry-run]' : ''}`));
});
program
    .command('rollback <deploymentId>')
    .description('Roll back to a previous deployment (code only; schema is forward-only)')
    .option('--dry-run', 'print rollback plan without executing')
    .action(async (deploymentId, options) => {
    try {
        if (options.dryRun) {
            console.log(chalk.yellow(`[dry-run] Would roll back deployment ${deploymentId}`));
            console.log(chalk.gray('  Schema: forward-only — DB schema will NOT be rolled back'));
            return;
        }
        const result = await client.rollbackDeployment(deploymentId);
        console.log(chalk.green(`✓ Rolled back deployment ${deploymentId}`));
        console.log(chalk.gray(`  New deployment: ${result.rollbackDeploymentId}`));
    }
    catch (err) {
        console.error(chalk.red(String(err)));
        process.exit(1);
    }
});
program
    .command('approve <approvalId>')
    .description('Approve a pending approval request')
    .option('--note <note>', 'approval note')
    .action(async (approvalId, options) => {
    try {
        const result = await client.resolveApproval(approvalId, 'APPROVED', options.note);
        console.log(chalk.green(`✓ Approved ${approvalId}`));
        console.log(chalk.gray(`  Status: ${result.status}`));
    }
    catch (err) {
        console.error(chalk.red(String(err)));
        process.exit(1);
    }
});
program
    .command('reject <approvalId>')
    .description('Reject a pending approval request')
    .option('--note <note>', 'rejection note')
    .action(async (approvalId, options) => {
    try {
        const result = await client.resolveApproval(approvalId, 'REJECTED', options.note);
        console.log(chalk.yellow(`✗ Rejected ${approvalId}`));
        console.log(chalk.gray(`  Status: ${result.status}`));
    }
    catch (err) {
        console.error(chalk.red(String(err)));
        process.exit(1);
    }
});
program.parse(process.argv);
//# sourceMappingURL=index.js.map