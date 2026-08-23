# R3 Intelligent Composer

## Database Design Document · v1.0

|Field         |Value                                   |
|--------------|----------------------------------------|
|Status        |**Draft — Ready for Engineering Review**|
|ORM           |Drizzle ORM (`drizzle-kit` migrations)  |
|Database      |PostgreSQL 15+                          |
|Migration Path|`packages/db/drizzle/`                  |
|Last Updated  |2026-05-31                              |

-----

## Table of Contents

1. [Design Principles](#1-design-principles)
1. [Entity Relationship Overview](#2-entity-relationship-overview)
1. [Table Specifications](#3-table-specifications)
- [users](#31-users)
- [compositions](#32-compositions)
- [tracks](#33-tracks)
- [projects](#34-projects)
- [project_compositions](#35-project_compositions)
- [composition_versions](#36-composition_versions)
- [exports](#37-exports)
- [style_profiles](#38-style_profiles)
- [audit_logs](#39-audit_logs)
1. [Indexes](#4-indexes)
1. [Constraints & Rules](#5-constraints--rules)
1. [Drizzle Schema Source](#6-drizzle-schema-source)
1. [Migration Notes](#7-migration-notes)
1. [Data Retention Policy](#8-data-retention-policy)

-----

## 1. Design Principles

|Principle                              |Detail                                                                                                  |
|---------------------------------------|--------------------------------------------------------------------------------------------------------|
|UUID primary keys                      |All tables use `gen_random_uuid()` as the default PK                                                    |
|`timestamptz` everywhere               |All timestamps stored as `timestamp with time zone`; no `timestamp` without tz                          |
|Soft deletes                           |Deletable resources use `deleted_at timestamptz`; hard deletes are background jobs                      |
|Append-only audit                      |`audit_logs` is never updated or deleted; it is an immutable event log                                  |
|JSON blobs for AI output               |Harmony, melody, and drum outputs are stored as validated `jsonb` columns                               |
|Versioned AI schemas                   |`schema_version` columns on `compositions` and `tracks` guard against breaking changes to JSON structure|
|Optimistic locking                     |`version integer` columns on `projects` prevent concurrent-write data loss                              |
|No nullable foreign keys without reason|Every FK column has a clear null semantics rationale in this document                                   |
|Row-level ownership enforced in queries|Every query includes `WHERE user_id = $userId`; no cross-user leakage from DB alone                     |

-----

## 2. Entity Relationship Overview

```
users
  │
  ├──< projects (user_id)
  │       │
  │       ├──< project_compositions (project_id)
  │       │         └──> compositions (composition_id)
  │       │
  │       └──< composition_versions (project_id)
  │
  ├──< compositions (user_id)
  │       │
  │       └──< tracks (composition_id)
  │
  ├──< exports (user_id, composition_id)
  │
  ├──< style_profiles (user_id)
  │
  └──< audit_logs (user_id)
```

**Cardinalities:**

|Relationship          |Type                            |
|----------------------|--------------------------------|
|User → Projects       |1:N                             |
|User → Compositions   |1:N                             |
|Project → Compositions|N:M (via `project_compositions`)|
|Composition → Tracks  |1:N                             |
|Project → Versions    |1:N                             |
|User → Exports        |1:N                             |
|User → StyleProfiles  |1:N                             |
|User → AuditLogs      |1:N                             |

-----

## 3. Table Specifications

### 3.1 `users`

> Existing table — no new columns required for Composer. Listed for FK reference.

|Column         |Type          |Nullable|Default            |Notes           |
|---------------|--------------|--------|-------------------|----------------|
|`id`           |`uuid`        |No      |`gen_random_uuid()`|PK              |
|`email`        |`varchar(255)`|No      |—                  |Unique          |
|`password_hash`|`text`        |No      |—                  |Argon2id        |
|`role`         |`varchar(20)` |No      |`'user'`           |`user` | `admin`|
|`created_at`   |`timestamptz` |No      |`now()`            |                |
|`updated_at`   |`timestamptz` |No      |`now()`            |                |
|`deleted_at`   |`timestamptz` |Yes     |`null`             |Soft delete     |

-----

### 3.2 `compositions`

Stores the core AI generation output. The `harmony_data`, `melody_data`, and `drum_data` columns hold the full typed JSON blobs produced by the agents.

|Column          |Type          |Nullable|Default            |Notes                                       |
|----------------|--------------|--------|-------------------|--------------------------------------------|
|`id`            |`uuid`        |No      |`gen_random_uuid()`|PK                                          |
|`user_id`       |`uuid`        |No      |—                  |FK → `users.id`                             |
|`key`           |`varchar(10)` |No      |—                  |e.g. `'Cm'`, `'F#'`                         |
|`bpm`           |`smallint`    |No      |—                  |60–200                                      |
|`time_signature`|`varchar(5)`  |No      |`'4/4'`            |`'4/4'`, `'3/4'`, `'6/8'`                   |
|`genre`         |`varchar(30)` |No      |—                  |From Genre enum                             |
|`mood`          |`varchar(30)` |No      |—                  |From Mood enum                              |
|`prompt`        |`text`        |No      |—                  |Original user prompt (max 500 chars)        |
|`harmony_data`  |`jsonb`       |No      |—                  |`HarmonyResult` JSON                        |
|`melody_data`   |`jsonb`       |No      |—                  |`MelodyResult[]` JSON                       |
|`drum_data`     |`jsonb`       |No      |—                  |`DrumPattern` JSON                          |
|`style_match`   |`numeric(4,3)`|No      |—                  |0.000–1.000 confidence score                |
|`low_confidence`|`boolean`     |No      |`false`            |`true` if `style_match < 0.65`              |
|`schema_version`|`smallint`    |No      |`1`                |Incremented on breaking agent schema changes|
|`generation_ms` |`integer`     |No      |—                  |Pipeline wall-clock time                    |
|`created_at`    |`timestamptz` |No      |`now()`            |                                            |

**Notes:**

- `harmony_data`, `melody_data`, `drum_data` are validated against their Zod schemas before insert — never raw agent output
- `schema_version` allows the application layer to handle migrations of old JSON blobs without a DB migration

-----

### 3.3 `tracks`

Individual instrument lanes within a composition. One row per instrument type per composition.

|Column          |Type         |Nullable|Default            |Notes                                               |
|----------------|-------------|--------|-------------------|----------------------------------------------------|
|`id`            |`uuid`       |No      |`gen_random_uuid()`|PK                                                  |
|`composition_id`|`uuid`       |No      |—                  |FK → `compositions.id` ON DELETE CASCADE            |
|`user_id`       |`uuid`       |No      |—                  |FK → `users.id` (denormalized for query performance)|
|`track_type`    |`varchar(20)`|No      |—                  |`melody`, `hook`, `chords`, `drums`                 |
|`midi_data`     |`jsonb`      |No      |—                  |Serialized MIDI note events                         |
|`channel`       |`smallint`   |No      |—                  |MIDI channel: 1=melody, 2=chords, 10=drums          |
|`muted`         |`boolean`    |No      |`false`            |                                                    |
|`solo`          |`boolean`    |No      |`false`            |                                                    |
|`volume`        |`smallint`   |No      |`100`              |0–127                                               |
|`schema_version`|`smallint`   |No      |`1`                |                                                    |
|`created_at`    |`timestamptz`|No      |`now()`            |                                                    |
|`updated_at`    |`timestamptz`|No      |`now()`            |                                                    |

**Notes:**

- `ON DELETE CASCADE` from `compositions` — deleting a composition removes all its tracks
- `track_type` + `composition_id` is unique (one melody track per composition, etc.)

-----

### 3.4 `projects`

Named containers that group compositions and store user-facing project metadata.

|Column      |Type          |Nullable|Default            |Notes                           |
|------------|--------------|--------|-------------------|--------------------------------|
|`id`        |`uuid`        |No      |`gen_random_uuid()`|PK                              |
|`user_id`   |`uuid`        |No      |—                  |FK → `users.id`                 |
|`name`      |`varchar(100)`|No      |—                  |User-defined name               |
|`tags`      |`text[]`      |No      |`ARRAY[]::text[]`  |Up to 10 tags, each max 30 chars|
|`version`   |`integer`     |No      |`1`                |Optimistic lock counter         |
|`deleted_at`|`timestamptz` |Yes     |`null`             |Soft delete; null = active      |
|`created_at`|`timestamptz` |No      |`now()`            |                                |
|`updated_at`|`timestamptz` |No      |`now()`            |                                |

**Notes:**

- Soft-deleted projects are excluded from all queries via `WHERE deleted_at IS NULL`
- Hard delete is a scheduled job that runs 30 days after `deleted_at`
- Optimistic locking: before update, check `WHERE version = $expectedVersion`; if 0 rows updated, throw `ConflictError`

-----

### 3.5 `project_compositions`

Join table linking projects to compositions. A project can hold many compositions (one per generation or regeneration).

|Column          |Type         |Nullable|Default            |Notes                                           |
|----------------|-------------|--------|-------------------|------------------------------------------------|
|`id`            |`uuid`       |No      |`gen_random_uuid()`|PK                                              |
|`project_id`    |`uuid`       |No      |—                  |FK → `projects.id` ON DELETE CASCADE            |
|`composition_id`|`uuid`       |No      |—                  |FK → `compositions.id`                          |
|`is_active`     |`boolean`    |No      |`true`             |The currently active composition for the project|
|`created_at`    |`timestamptz`|No      |`now()`            |                                                |

**Notes:**

- Only one row per `project_id` should have `is_active = true`; enforced by a partial unique index
- When a new composition is attached, set all other rows for that `project_id` to `is_active = false` in the same transaction

-----

### 3.6 `composition_versions`

Immutable snapshots of project state at a point in time. Supports version history and rollback.

|Column          |Type         |Nullable|Default            |Notes                                      |
|----------------|-------------|--------|-------------------|-------------------------------------------|
|`id`            |`uuid`       |No      |`gen_random_uuid()`|PK                                         |
|`project_id`    |`uuid`       |No      |—                  |FK → `projects.id` ON DELETE CASCADE       |
|`composition_id`|`uuid`       |No      |—                  |FK → `compositions.id`                     |
|`user_id`       |`uuid`       |No      |—                  |FK → `users.id`                            |
|`version_number`|`integer`    |No      |—                  |Sequential per project (1, 2, 3…)          |
|`label`         |`varchar(50)`|Yes     |`null`             |Optional user-supplied label               |
|`snapshot`      |`jsonb`      |No      |—                  |Full serialized project + composition state|
|`created_at`    |`timestamptz`|No      |`now()`            |                                           |

**Notes:**

- `version_number` is assigned as `MAX(version_number) + 1` for the project within the same transaction as the insert
- Maximum 20 versions retained per project; the oldest is purged when the 21st is created
- The `snapshot` column is a complete denormalized state — not a diff. This ensures rollback never depends on a chain of prior snapshots.

-----

### 3.7 `exports`

Records every MIDI export event and stores the storage reference and metadata.

|Column           |Type          |Nullable|Default            |Notes                                    |
|-----------------|--------------|--------|-------------------|-----------------------------------------|
|`id`             |`uuid`        |No      |`gen_random_uuid()`|PK                                       |
|`user_id`        |`uuid`        |No      |—                  |FK → `users.id`                          |
|`composition_id` |`uuid`        |No      |—                  |FK → `compositions.id`                   |
|`export_type`    |`varchar(10)` |No      |—                  |`melody`, `chords`, `drums`, `full`      |
|`file_name`      |`varchar(255)`|No      |—                  |e.g. `dark-trap-vol-1-full.mid`          |
|`storage_key`    |`text`        |No      |—                  |Object storage path/key                  |
|`file_size_bytes`|`integer`     |No      |—                  |                                         |
|`expires_at`     |`timestamptz` |No      |—                  |Signed URL expiry (90 days from creation)|
|`created_at`     |`timestamptz` |No      |`now()`            |                                         |

**Notes:**

- On re-export of an identical `(composition_id, export_type)` within the TTL window, return the existing record rather than re-generating
- After `expires_at`, the object storage file is deleted by a scheduled job

-----

### 3.8 `style_profiles`

User-saved collections of genre, mood, BPM, and key preferences for rapid re-use.

|Column          |Type          |Nullable|Default            |Notes               |
|----------------|--------------|--------|-------------------|--------------------|
|`id`            |`uuid`        |No      |`gen_random_uuid()`|PK                  |
|`user_id`       |`uuid`        |No      |—                  |FK → `users.id`     |
|`name`          |`varchar(100)`|No      |—                  |User-defined name   |
|`genre`         |`varchar(30)` |No      |—                  |                    |
|`mood`          |`varchar(30)` |No      |—                  |                    |
|`bpm`           |`smallint`    |Yes     |`null`             |null = auto         |
|`key`           |`varchar(10)` |Yes     |`null`             |null = auto         |
|`time_signature`|`varchar(5)`  |No      |`'4/4'`            |                    |
|`is_default`    |`boolean`     |No      |`false`            |One default per user|
|`created_at`    |`timestamptz` |No      |`now()`            |                    |
|`updated_at`    |`timestamptz` |No      |`now()`            |                    |

-----

### 3.9 `audit_logs`

Append-only, never updated, never deleted. Records all mutation operations for compliance, debugging, and security review.

|Column         |Type          |Nullable|Default            |Notes                                                       |
|---------------|--------------|--------|-------------------|------------------------------------------------------------|
|`id`           |`uuid`        |No      |`gen_random_uuid()`|PK                                                          |
|`user_id`      |`uuid`        |Yes     |`null`             |Null for unauthenticated attempts                           |
|`action`       |`varchar(100)`|No      |—                  |e.g. `project.create`, `composition.generate`, `export.midi`|
|`resource_type`|`varchar(50)` |Yes     |`null`             |e.g. `project`, `composition`, `export`                     |
|`resource_id`  |`uuid`        |Yes     |`null`             |ID of the affected resource                                 |
|`ip_address`   |`inet`        |Yes     |`null`             |Client IP                                                   |
|`user_agent`   |`text`        |Yes     |`null`             |                                                            |
|`request_id`   |`uuid`        |No      |—                  |Trace ID generated per request                              |
|`metadata`     |`jsonb`       |Yes     |`null`             |Additional context (non-PII)                                |
|`created_at`   |`timestamptz` |No      |`now()`            |                                                            |

**Notes:**

- No `UPDATE` or `DELETE` operations are ever issued against this table
- A PostgreSQL `RULE` or `TRIGGER` can enforce this at the DB level in production
- `metadata` must not contain PII (no raw prompt text, no passwords, no emails)
- Retained for 365 days; purge is append-only-safe (DELETE by `created_at < now() - interval '365 days'` in a maintenance job)

-----

## 4. Indexes

### Performance Indexes

```sql
-- compositions: user timeline
CREATE INDEX idx_compositions_user_created
  ON compositions (user_id, created_at DESC);

-- projects: user list (active only)
CREATE INDEX idx_projects_user_active
  ON projects (user_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- project_compositions: find active composition for a project
CREATE INDEX idx_project_compositions_active
  ON project_compositions (project_id)
  WHERE is_active = true;

-- exports: re-export deduplication
CREATE INDEX idx_exports_composition_type
  ON exports (composition_id, export_type, expires_at);

-- exports: user list
CREATE INDEX idx_exports_user_created
  ON exports (user_id, created_at DESC);

-- tracks: all tracks for a composition
CREATE INDEX idx_tracks_composition
  ON tracks (composition_id);

-- composition_versions: history for a project
CREATE INDEX idx_versions_project_number
  ON composition_versions (project_id, version_number DESC);

-- audit_logs: time-range queries
CREATE INDEX idx_audit_logs_created
  ON audit_logs (created_at DESC);

-- audit_logs: per-user lookup
CREATE INDEX idx_audit_logs_user_created
  ON audit_logs (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- style_profiles: user profiles
CREATE INDEX idx_style_profiles_user
  ON style_profiles (user_id);
```

### Unique Constraints

```sql
-- Only one active composition per project
CREATE UNIQUE INDEX idx_project_compositions_one_active
  ON project_compositions (project_id)
  WHERE is_active = true;

-- One track type per composition
CREATE UNIQUE INDEX idx_tracks_type_per_composition
  ON tracks (composition_id, track_type);

-- One default style profile per user
CREATE UNIQUE INDEX idx_style_profiles_one_default
  ON style_profiles (user_id)
  WHERE is_default = true;
```

-----

## 5. Constraints & Rules

### Foreign Key Cascade Behavior

|FK                                                       |ON DELETE|ON UPDATE|
|---------------------------------------------------------|---------|---------|
|`compositions.user_id` → `users.id`                      |RESTRICT |CASCADE  |
|`tracks.composition_id` → `compositions.id`              |CASCADE  |CASCADE  |
|`tracks.user_id` → `users.id`                            |RESTRICT |CASCADE  |
|`projects.user_id` → `users.id`                          |RESTRICT |CASCADE  |
|`project_compositions.project_id` → `projects.id`        |CASCADE  |CASCADE  |
|`project_compositions.composition_id` → `compositions.id`|RESTRICT |CASCADE  |
|`composition_versions.project_id` → `projects.id`        |CASCADE  |CASCADE  |
|`composition_versions.composition_id` → `compositions.id`|RESTRICT |CASCADE  |
|`exports.user_id` → `users.id`                           |RESTRICT |CASCADE  |
|`exports.composition_id` → `compositions.id`             |RESTRICT |CASCADE  |
|`style_profiles.user_id` → `users.id`                    |CASCADE  |CASCADE  |
|`audit_logs.user_id` → `users.id`                        |SET NULL |CASCADE  |

### Check Constraints

```sql
ALTER TABLE compositions  ADD CONSTRAINT chk_bpm          CHECK (bpm BETWEEN 60 AND 200);
ALTER TABLE compositions  ADD CONSTRAINT chk_style_match  CHECK (style_match BETWEEN 0 AND 1);
ALTER TABLE tracks        ADD CONSTRAINT chk_volume       CHECK (volume BETWEEN 0 AND 127);
ALTER TABLE tracks        ADD CONSTRAINT chk_channel      CHECK (channel IN (1, 2, 10));
ALTER TABLE tracks        ADD CONSTRAINT chk_track_type   CHECK (track_type IN ('melody', 'hook', 'chords', 'drums'));
ALTER TABLE exports       ADD CONSTRAINT chk_export_type  CHECK (export_type IN ('melody', 'chords', 'drums', 'full'));
```

-----

## 6. Drizzle Schema Source

Full Drizzle schema definition for `packages/db/src/schema/composer.ts`:

```typescript
import {
  pgTable,
  uuid,
  varchar,
  text,
  smallint,
  integer,
  boolean,
  numeric,
  jsonb,
  timestamp,
  inet,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ── Shared helpers ──────────────────────────────────────────────────────────

const id        = uuid('id').primaryKey().default(sql`gen_random_uuid()`)
const createdAt = timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const updatedAt = timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()

// ── compositions ─────────────────────────────────────────────────────────────

export const compositions = pgTable('compositions', {
  id:             id,
  userId:         uuid('user_id').notNull().references(() => users.id),
  key:            varchar('key', { length: 10 }).notNull(),
  bpm:            smallint('bpm').notNull(),
  timeSignature:  varchar('time_signature', { length: 5 }).notNull().default('4/4'),
  genre:          varchar('genre', { length: 30 }).notNull(),
  mood:           varchar('mood', { length: 30 }).notNull(),
  prompt:         text('prompt').notNull(),
  harmonyData:    jsonb('harmony_data').notNull(),
  melodyData:     jsonb('melody_data').notNull(),
  drumData:       jsonb('drum_data').notNull(),
  styleMatch:     numeric('style_match', { precision: 4, scale: 3 }).notNull(),
  lowConfidence:  boolean('low_confidence').notNull().default(false),
  schemaVersion:  smallint('schema_version').notNull().default(1),
  generationMs:   integer('generation_ms').notNull(),
  createdAt,
})

// ── tracks ───────────────────────────────────────────────────────────────────

export const tracks = pgTable('tracks', {
  id:            id,
  compositionId: uuid('composition_id')
    .notNull()
    .references(() => compositions.id, { onDelete: 'cascade' }),
  userId:        uuid('user_id').notNull().references(() => users.id),
  trackType:     varchar('track_type', { length: 20 }).notNull(),
  midiData:      jsonb('midi_data').notNull(),
  channel:       smallint('channel').notNull(),
  muted:         boolean('muted').notNull().default(false),
  solo:          boolean('solo').notNull().default(false),
  volume:        smallint('volume').notNull().default(100),
  schemaVersion: smallint('schema_version').notNull().default(1),
  createdAt,
  updatedAt,
})

// ── projects ──────────────────────────────────────────────────────────────────

export const projects = pgTable('projects', {
  id:        id,
  userId:    uuid('user_id').notNull().references(() => users.id),
  name:      varchar('name', { length: 100 }).notNull(),
  tags:      text('tags').array().notNull().default(sql`ARRAY[]::text[]`),
  version:   integer('version').notNull().default(1),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt,
  updatedAt,
})

// ── project_compositions ──────────────────────────────────────────────────────

export const projectCompositions = pgTable('project_compositions', {
  id:            id,
  projectId:     uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  compositionId: uuid('composition_id')
    .notNull()
    .references(() => compositions.id),
  isActive:      boolean('is_active').notNull().default(true),
  createdAt,
})

// ── composition_versions ──────────────────────────────────────────────────────

export const compositionVersions = pgTable('composition_versions', {
  id:            id,
  projectId:     uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  compositionId: uuid('composition_id')
    .notNull()
    .references(() => compositions.id),
  userId:        uuid('user_id').notNull().references(() => users.id),
  versionNumber: integer('version_number').notNull(),
  label:         varchar('label', { length: 50 }),
  snapshot:      jsonb('snapshot').notNull(),
  createdAt,
})

// ── exports ───────────────────────────────────────────────────────────────────

export const exports = pgTable('exports', {
  id:            id,
  userId:        uuid('user_id').notNull().references(() => users.id),
  compositionId: uuid('composition_id').notNull().references(() => compositions.id),
  exportType:    varchar('export_type', { length: 10 }).notNull(),
  fileName:      varchar('file_name', { length: 255 }).notNull(),
  storageKey:    text('storage_key').notNull(),
  fileSizeBytes: integer('file_size_bytes').notNull(),
  expiresAt:     timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt,
})

// ── style_profiles ────────────────────────────────────────────────────────────

export const styleProfiles = pgTable('style_profiles', {
  id:            id,
  userId:        uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name:          varchar('name', { length: 100 }).notNull(),
  genre:         varchar('genre', { length: 30 }).notNull(),
  mood:          varchar('mood', { length: 30 }).notNull(),
  bpm:           smallint('bpm'),
  key:           varchar('key', { length: 10 }),
  timeSignature: varchar('time_signature', { length: 5 }).notNull().default('4/4'),
  isDefault:     boolean('is_default').notNull().default(false),
  createdAt,
  updatedAt,
})

// ── audit_logs ────────────────────────────────────────────────────────────────

export const auditLogs = pgTable('audit_logs', {
  id:           id,
  userId:       uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action:       varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 50 }),
  resourceId:   uuid('resource_id'),
  ipAddress:    inet('ip_address'),
  userAgent:    text('user_agent'),
  requestId:    uuid('request_id').notNull(),
  metadata:     jsonb('metadata'),
  createdAt,
})
```

### Re-export in `packages/db/src/schema/index.ts`

```typescript
// Add these exports to the existing re-export file
export {
  compositions,
  tracks,
  projects,
  projectCompositions,
  compositionVersions,
  exports,
  styleProfiles,
  auditLogs,
} from './composer'
```

-----

## 7. Migration Notes

### Pre-Conditions

Before running the migration for this feature:

1. `pnpm tsc --noEmit` must pass with zero errors
1. All existing migrations in the journal must be in `applied` state
1. Run `drizzle-kit generate` and review the generated SQL before `migrate`
1. Take a timestamped backup: `pg_dump r3_db > backup_$(date +%Y%m%d_%H%M%S).sql`

### Migration File Structure

The Composer feature produces a single migration file:

```
packages/db/drizzle/
├── meta/
│   └── _journal.json   ← updated automatically by drizzle-kit
└── 0004_composer_tables.sql   ← new migration
```

> Number `0004` assumes three prior migrations exist. The actual number is assigned by `drizzle-kit generate`.

### Post-Migration Verification

After applying the migration, verify with:

```sql
-- Confirm all 8 new tables exist
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'compositions', 'tracks', 'projects',
    'project_compositions', 'composition_versions',
    'exports', 'style_profiles', 'audit_logs'
  )
ORDER BY tablename;
-- Expected: 8 rows

-- Confirm indexes
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('compositions', 'projects', 'tracks', 'exports')
ORDER BY indexname;

-- Confirm constraints
SELECT conname, contype, conrelid::regclass
FROM pg_constraint
WHERE conrelid::regclass::text IN (
  'compositions', 'tracks', 'projects', 'exports'
)
ORDER BY conrelid::regclass;
```

### Schema Drift Protocol

If a column name in the Drizzle schema file ever diverges from the actual DB column (as happened with `ai_transition_usage.used_at` vs `usage_date`):

1. **Never** fix it by editing an applied migration
1. Generate a new migration: `drizzle-kit generate --name fix_column_name`
1. Review the generated SQL confirms only the intended rename
1. Apply and update `_journal.json`

-----

## 8. Data Retention Policy

|Table                 |Retention                     |Cleanup Mechanism                                                     |
|----------------------|------------------------------|----------------------------------------------------------------------|
|`compositions`        |Indefinite (while user active)|Cascade from user soft-delete                                         |
|`tracks`              |Cascade from `compositions`   |`ON DELETE CASCADE`                                                   |
|`projects`            |30 days after soft-delete     |Scheduled job: `DELETE WHERE deleted_at < now() - interval '30 days'` |
|`project_compositions`|Cascade from project          |`ON DELETE CASCADE`                                                   |
|`composition_versions`|Max 20 per project            |Trigger or application-layer purge on version 21+                     |
|`exports`             |90 days from creation         |Scheduled job: delete storage object then row                         |
|`style_profiles`      |Indefinite (while user active)|Cascade from user delete                                              |
|`audit_logs`          |365 days                      |Scheduled job: `DELETE WHERE created_at < now() - interval '365 days'`|

### Scheduled Jobs

All retention jobs run during off-peak hours (02:00–04:00 UTC) as Railway scheduled tasks:

```
purge_deleted_projects     — daily — DELETE projects WHERE deleted_at < now() - 30d
purge_expired_exports      — daily — DELETE exports WHERE expires_at < now()
purge_old_audit_logs       — weekly — DELETE audit_logs WHERE created_at < now() - 365d
```