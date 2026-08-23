import { sqliteTable, text, integer, index, real } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => nanoid(16)),
  email: text('email').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const agents = sqliteTable('agents', {
  id: text('id').primaryKey().$defaultFn(() => nanoid(16)),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  status: text('status').default('idle'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const tools = sqliteTable('tools', {
  id: text('id').primaryKey().$defaultFn(() => nanoid(16)),
  name: text('name').notNull(),
  description: text('description').notNull(),
  version: text('version').notNull().default('1.0.0'),
  schemaJson: text('schema_json').notNull().default('{}'),
  agentId: text('agent_id').references(() => agents.id),
  registeredAt: integer('registered_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  status: text('status').notNull().default('active'),
}, table => ({
  statusIdx: index('tools_status_idx').on(table.status),
  agentIdx: index('tools_agent_idx').on(table.agentId),
}))

// ────── Phase 3: Health Checks & Observability ──────

export const health_checks = sqliteTable('health_checks', {
  id: text('id').primaryKey().$defaultFn(() => nanoid(16)),
  component: text('component').notNull(),
  status: text('status').notNull(),
  latency_ms: integer('latency_ms'),
  message: text('message'),
  details: text('details'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  checked_at: integer('checked_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, table => ({
  componentIdx: index('health_checks_component_idx').on(table.component),
  statusIdx: index('health_checks_status_idx').on(table.status),
  timestampIdx: index('health_checks_timestamp_idx').on(table.timestamp),
}))

export const tool_executions = sqliteTable('tool_executions', {
  id: text('id').primaryKey().$defaultFn(() => nanoid(16)),
  toolId: text('tool_id').notNull().references(() => tools.id),
  agentId: text('agent_id').notNull().references(() => agents.id),
  status: text('status').notNull(),
  duration_ms: integer('duration_ms'),
  input: text('input'),
  output: text('output'),
  error: text('error'),
  retries: integer('retries').default(0),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, table => ({
  toolIdx: index('tool_executions_tool_idx').on(table.toolId),
  agentIdx: index('tool_executions_agent_idx').on(table.agentId),
  statusIdx: index('tool_executions_status_idx').on(table.status),
  timestampIdx: index('tool_executions_timestamp_idx').on(table.timestamp),
}))

export const agent_events = sqliteTable('agent_events', {
  id: text('id').primaryKey().$defaultFn(() => nanoid(16)),
  agentId: text('agent_id').notNull().references(() => agents.id),
  event_type: text('event_type').notNull(),
  old_state: text('old_state'),
  new_state: text('new_state'),
  metadata: text('metadata'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, table => ({
  agentIdx: index('agent_events_agent_idx').on(table.agentId),
  eventTypeIdx: index('agent_events_type_idx').on(table.event_type),
  timestampIdx: index('agent_events_timestamp_idx').on(table.timestamp),
}))
