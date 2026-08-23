// scripts/seed-tools.ts
// Seeds built-in Agent-OS tools into the dashboard.
// Usage: npx tsx scripts/seed-tools.ts [--url http://localhost:5000]

import { defineTool } from '../packages/sdk/src/define-tool.js';

const args = process.argv.slice(2);
const urlIdx = args.indexOf('--url');
const SERVER_URL = urlIdx !== -1
  ? args[urlIdx + 1]
  : (process.env['AGENT_OS_URL'] ?? 'http://localhost:5000');

const BUILT_IN_TOOLS = [
  {
    id: 'tool.r3.troubleshoot',
    name: 'R3 Troubleshoot',
    description: 'Dispatches a troubleshooting session against an R3 Vibe mix session',
    version: '1.0.0',
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'R3 session UUID' },
        symptoms:  { type: 'array', items: { type: 'string' }, description: 'Observed issues' },
      },
      required: ['sessionId', 'symptoms'],
    },
  },
  {
    id: 'tool.r3.mix-suggest',
    name: 'Mix Suggestion',
    description: 'Runs LLPTE inference and returns AI mix suggestions for a track',
    version: '1.0.0',
    schema: {
      type: 'object',
      properties: {
        trackId:    { type: 'string', description: 'Track UUID' },
        confidence: { type: 'number', minimum: 0, maximum: 1, description: 'LLPTE confidence gate override' },
      },
      required: ['trackId'],
    },
  },
  {
    id: 'tool.r3.auto-level',
    name: 'Auto Leveling',
    description: 'Applies LLPTE-driven auto-leveling to a stem or full mix',
    version: '1.0.0',
    schema: {
      type: 'object',
      properties: {
        trackId: { type: 'string' },
        target:  { type: 'string', enum: ['stem', 'mix'] },
      },
      required: ['trackId'],
    },
  },
  {
    id: 'tool.agent-os.dispatch',
    name: 'Agent Dispatch',
    description: 'Dispatches a typed agent task through the Agent-OS orchestration layer',
    version: '1.0.0',
    schema: {
      type: 'object',
      properties: {
        agentId: { type: 'string' },
        type:    { type: 'string' },
        payload: { type: 'object' },
      },
      required: ['agentId', 'type'],
    },
  },
];

async function main(): Promise<void> {
  console.log(`[seed] Connecting to Agent-OS at ${SERVER_URL}`);
  let passed = 0;
  let failed = 0;

  for (const tool of BUILT_IN_TOOLS) {
    try {
      const result = await defineTool(tool, { serverUrl: SERVER_URL });
      console.log(`  ✓ ${result.id} — ${result.status}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${tool.id} — ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\n[seed] Done: ${passed} registered, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
