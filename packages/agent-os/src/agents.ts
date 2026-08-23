/**
 * packages/db/schema/agents.ts  (Agi-Suite monorepo)
 *
 * Full agent registry schema.
 * Run after editing:
 *   pnpm --filter @agi-suite/db db:generate
 *   pnpm --filter @agi-suite/db db:migrate
 */
import {
  pgTable,
  pgEnum,
  text,
  uuid,
  timestamp,
  jsonb,
  boolean,
  integer,
  index,
} from 'drizzle-orm/pg-core';

// ─── Enums ────────────────────────────────────────────────────────────────

export const agentStatusEnum = pgEnum('agent_status', [
  'registered',   // created in Agent-OS, not yet claimed by runner
  'deploying',    // claimed by runner, handler not yet started
  'running',      // handler actively executing
  'idle',         // handler completed successfully
  'error',        // handler threw, errorLog populated
  'terminated',   // manually stopped or timed out
]);

export const agentTargetEnum = pgEnum('agent_target', [
  'r3v4',       // inject into R3v4 via AgentBridge
  'agi-suite',  // internal Agi-Suite work only
  'both',       // both
]);

export const agentTypeEnum = pgEnum('agent_type', [
  'troubleshoot',
  'mix',
  'vocal-spectra',
  'style-delta',
  'custom',
]);

// ─── agents ───────────────────────────────────────────────────────────────

export const agents = pgTable('agents', {
  id:            uuid('id').defaultRandom().primaryKey(),
  name:          text('name').notNull(),
  type:          agentTypeEnum('type').notNull(),
  status:        agentStatusEnum('status').default('registered').notNull(),
  target:        agentTargetEnum('target').default('r3v4').notNull(),

  // R3v4 scope — null if agent-suite-only
  sessionId:     text('session_id'),
  projectId:     text('project_id'),

  // Agent-OS owner — always sourced from JWT, never client payload
  ownerId:       text('owner_id').notNull(),

  // Agent-type-specific configuration blob
  config:        jsonb('config').notNull().$type<Record<string, unknown>>(),

  // Retry tracking
  attemptCount:  integer('attempt_count').default(0).notNull(),
  maxAttempts:   integer('max_attempts').default(3).notNull(),

  // Timestamps
  createdAt:     timestamp('created_at').defaultNow().notNull(),
  deployedAt:    timestamp('deployed_at'),          // set when claimed by runner
  completedAt:   timestamp('completed_at'),         // set when status → idle
  lastHeartbeat: timestamp('last_heartbeat'),       // updated every 10s by AgentBridge

  // Error detail
  errorLog:      text('error_log'),

  // Outbox flag: set true by pg trigger AFTER insert.
  // Runner polls WHERE notified = false to catch events missed during downtime.
  notified:      boolean('notified').default(false).notNull(),
}, (table) => ({
  // Indexes for the polling outbox query
  statusIdx:     index('agents_status_idx').on(table.status),
  notifiedIdx:   index('agents_notified_idx').on(table.notified),
  ownerIdx:      index('agents_owner_idx').on(table.ownerId),
  deployedAtIdx: index('agents_deployed_at_idx').on(table.deployedAt),
}));

// ─── agent_actions (audit log — Agi-Suite side) ───────────────────────────

export const agentActions = pgTable('agent_actions', {
  id:          uuid('id').defaultRandom().primaryKey(),
  agentId:     uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }).notNull(),
  actionType:  text('action_type').notNull(),  // 'logDecision' | 'mixSuggestion' | 'dspParam' | 'diagnostic'
  payload:     jsonb('payload').notNull().$type<Record<string, unknown>>(),
  result:      jsonb('result').$type<Record<string, unknown>>(),
  status:      text('status').default('pending').notNull(),  // 'pending' | 'resolved' | 'failed'
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  resolvedAt:  timestamp('resolved_at'),
}, (table) => ({
  agentIdIdx:  index('agent_actions_agent_id_idx').on(table.agentId),
  statusIdx:   index('agent_actions_status_idx').on(table.status),
}));

// ─── Types ────────────────────────────────────────────────────────────────

export type Agent       = typeof agents.$inferSelect;
export type NewAgent    = typeof agents.$inferInsert;
export type AgentAction = typeof agentActions.$inferSelect;
export type NewAgentAction = typeof agentActions.$inferInsert;
