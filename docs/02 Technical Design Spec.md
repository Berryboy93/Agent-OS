# R3 Intelligent Composer

## Technical Design Specification (TDS) · v1.0

|Field       |Value                                                            |
|------------|-----------------------------------------------------------------|
|Status      |**Draft — Ready for Engineering Review**                         |
|Author      |R3 Native Engineering                                            |
|Depends On  |PRD v1.0                                                         |
|Stack       |TypeScript · React · Vite · Express · tRPC · Drizzle · PostgreSQL|
|Last Updated|2026-05-31                                                       |

-----

## Table of Contents

1. [System Overview](#1-system-overview)
1. [Monorepo Structure](#2-monorepo-structure)
1. [Frontend Architecture](#3-frontend-architecture)
1. [Backend Architecture](#4-backend-architecture)
1. [AI Pipeline — LLPTE Extension](#5-ai-pipeline--llpte-extension)
1. [tRPC API Layer](#6-trpc-api-layer)
1. [Database Layer](#7-database-layer)
1. [MIDI Engine](#8-midi-engine)
1. [Authentication & Authorization](#9-authentication--authorization)
1. [State Management](#10-state-management)
1. [Error Handling Strategy](#11-error-handling-strategy)
1. [Caching Strategy](#12-caching-strategy)
1. [Testing Strategy](#13-testing-strategy)
1. [Deployment Architecture](#14-deployment-architecture)
1. [Engineering Standards](#15-engineering-standards)

-----

## 1. System Overview

R3 Intelligent Composer is implemented as a new **feature package** inside the existing `~/Stable` pnpm monorepo. It reuses all existing infrastructure (auth, database connection, tRPC transport, LLPTE pipeline) and adds the Composer-specific routers, UI pages, and AI agents.

### High-Level Data Flow

```
User (Browser)
    │
    ▼
React UI  ─── Zustand Store ──► Composer Page / Copilot Page
    │
    │  tRPC (HTTP + WebSocket)
    ▼
Express Server
    │
    ├── composerRouter     ─► Harmony Agent → Melody Agent → Rhythm Agent
    ├── projectsRouter     ─► CRUD + versioning
    ├── exportsRouter      ─► MIDI Engine → Storage
    └── copilotRouter      ─► Analysis Agent
            │
            ▼
    LLPTE Pipeline (extended)
    inputRouter → spectralAnalyzer → aiMixEngine → transitionGraph → outputBus
            │
            ▼
    Anthropic API  /  Internal Inference
            │
            ▼
    Drizzle ORM → PostgreSQL
```

### Monorepo Package Assignment

|Concern                     |Package              |
|----------------------------|---------------------|
|Composer UI components      |`packages/ui`        |
|Composer pages (routes)     |`apps/web`           |
|Composer tRPC routers       |`packages/server`    |
|AI agents                   |`packages/ai` (new)  |
|MIDI engine                 |`packages/midi` (new)|
|Shared types/schemas        |`packages/shared`    |
|Database schema + migrations|`packages/db`        |

-----

## 2. Monorepo Structure

### New Packages

```
~/Stable/
├── apps/
│   └── web/
│       └── src/
│           └── pages/
│               ├── ComposerPage.tsx          ← New
│               ├── ComposerProjectPage.tsx   ← New
│               └── CopilotPage.tsx           ← New
│
├── packages/
│   ├── ai/                                   ← New package
│   │   ├── src/
│   │   │   ├── agents/
│   │   │   │   ├── harmonyAgent.ts
│   │   │   │   ├── melodyAgent.ts
│   │   │   │   ├── rhythmAgent.ts
│   │   │   │   └── analysisAgent.ts
│   │   │   ├── pipeline/
│   │   │   │   └── composerPipeline.ts       ← Extends LLPTE
│   │   │   ├── schemas/
│   │   │   │   ├── harmonySchema.ts
│   │   │   │   ├── melodySchema.ts
│   │   │   │   ├── rhythmSchema.ts
│   │   │   │   └── analysisSchema.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── midi/                                  ← New package
│   │   ├── src/
│   │   │   ├── serializer.ts
│   │   │   ├── validator.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── server/
│   │   └── src/
│   │       └── routers/
│   │           ├── composerRouter.ts          ← New
│   │           ├── projectsRouter.ts          ← New
│   │           ├── exportsRouter.ts           ← New
│   │           └── copilotRouter.ts           ← New
│   │
│   └── db/
│       └── src/
│           └── schema/
│               ├── composer.ts                ← New tables
│               └── index.ts                  ← Re-export
```

-----

## 3. Frontend Architecture

### Pages & Routes (Wouter)

All routes are added to the existing Wouter router. No react-router-dom.

```typescript
// apps/web/src/App.tsx — additions only
<Route path="/composer" component={ComposerPage} />
<Route path="/composer/:projectId" component={ComposerProjectPage} />
<Route path="/copilot" component={CopilotPage} />
```

### Page Components

#### `ComposerPage.tsx`

The main entry point. Renders:

- `<ComposerPromptPanel>` — prompt input, genre/mood selectors, BPM/key fields
- `<ComposerResultPanel>` — chord grid, melody piano roll preview, drum step sequencer
- `<ComposerActionBar>` — save, export, open copilot
- Uses `ag-header` pattern (consistent with the established UI standard)

#### `ComposerProjectPage.tsx`

Project detail view. Renders:

- `<ProjectHeader>` — name, tags, last modified
- `<CompositionTimeline>` — list of saved versions
- `<CompositionDetail>` — expanded view of selected composition

#### `CopilotPage.tsx`

Producer Copilot interface. Renders:

- `<CopilotScoreCard>` — overall + dimension scores
- `<CopilotRecommendationList>` — sorted by severity
- `<CopilotChatPanel>` — follow-up prompt input

### Component Tree

```
ComposerPage
├── ag-header (standard)
├── ComposerPromptPanel
│   ├── PromptTextarea
│   ├── GenreMoodSelector
│   └── BpmKeyLockRow
├── ComposerResultPanel
│   ├── ChordProgressionGrid
│   ├── MelodyRollPreview
│   └── DrumStepSequencer
└── ComposerActionBar
    ├── SaveButton
    ├── ExportDropdown
    └── CopilotButton
```

### Styling

- Tailwind utility classes only (no custom CSS modules for new components)
- Accent color: consistent with the established R3 accent variable
- Dark theme only; no light mode toggle in v1.0
- No inline styles

-----

## 4. Backend Architecture

### Express Server Integration

New routers are registered in `server/index.ts` alongside existing routers:

```typescript
// server/index.ts — additions
import { composerRouter } from './routers/composerRouter'
import { projectsRouter } from './routers/projectsRouter'
import { exportsRouter }   from './routers/exportsRouter'
import { copilotRouter }   from './routers/copilotRouter'

export const appRouter = router({
  // ... existing routers
  composer:  composerRouter,
  projects:  projectsRouter,
  exports:   exportsRouter,
  copilot:   copilotRouter,
})
```

### Router Responsibilities

|Router          |Procedures                                                      |Auth Required|
|----------------|----------------------------------------------------------------|-------------|
|`composerRouter`|`generate`, `regenerate`, `getComposition`                      |Yes          |
|`projectsRouter`|`create`, `update`, `delete`, `save`, `load`, `list`, `versions`|Yes          |
|`exportsRouter` |`exportMidi`, `getExport`, `listExports`                        |Yes          |
|`copilotRouter` |`analyze`, `getSuggestions`                                     |Yes          |

### Middleware Stack (per request)

```
Request
  → validateJWT          (existing authMiddleware)
  → rateLimiter          (Redis-backed; scoped per route group)
  → inputValidator       (Zod schema; tRPC-native)
  → procedureHandler
  → auditLogger          (post-response; append-only)
```

-----

## 5. AI Pipeline — LLPTE Extension

The existing LLPTE pipeline (`inputRouter → spectralAnalyzer → aiMixEngine → transitionGraph → outputBus`) is extended with a **Composer Mode** that routes composition generation requests through a parallel agent chain.

### Pipeline Nodes — Composer Mode

```
composerPipeline
  │
  ├── Node 1: promptParser
  │     Input:  { prompt, genre, mood, bpm?, key? }
  │     Output: { parsedIntent, suggestedKey, suggestedBpm, styleVector }
  │     Model:  claude-sonnet-4-20250514
  │     Timeout: 5s
  │
  ├── Node 2: harmonyAgent
  │     Input:  promptParser output
  │     Output: HarmonyResult
  │     Model:  claude-sonnet-4-20250514
  │     Timeout: 8s
  │
  ├── Node 3: melodyAgent  [parallel with rhythmAgent]
  │     Input:  HarmonyResult + parsedIntent
  │     Output: MelodyResult[]
  │     Model:  claude-sonnet-4-20250514
  │     Timeout: 8s
  │
  ├── Node 4: rhythmAgent  [parallel with melodyAgent]
  │     Input:  HarmonyResult
  │     Output: DrumPattern
  │     Model:  claude-sonnet-4-20250514
  │     Timeout: 8s
  │
  └── Node 5: compositionBuilder
        Input:  HarmonyResult + MelodyResult[] + DrumPattern
        Output: Composition
        Timeout: 1s (no AI call; pure assembly)
```

Nodes 3 and 4 run in **parallel** via `Promise.all`. Total pipeline P95 target: **10 seconds**.

### Confidence Gating

After Node 5, a confidence score is computed against the requested `genre` + `mood`. If `styleMatch < 0.65`, the response includes a `lowConfidence: true` flag and the UI surfaces a “Try Again” prompt. This threshold is consistent with the existing LLPTE confidence gate.

### Agent Prompt Structure

Each agent uses a structured system prompt and JSON-mode response:

```typescript
// packages/ai/src/agents/harmonyAgent.ts

const HARMONY_SYSTEM = `
You are a professional music theory engine.
Respond ONLY with valid JSON matching the HarmonyResult schema.
Do not include markdown, preamble, or commentary.
`.trim()

async function runHarmonyAgent(input: ParsedIntent): Promise<HarmonyResult> {
  const response = await anthropicClient.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system:     HARMONY_SYSTEM,
    messages:   [{ role: 'user', content: JSON.stringify(input) }],
  })

  const raw = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')

  return HarmonyResultSchema.parse(JSON.parse(raw))
}
```

### Error Handling

Each agent wraps the Anthropic call in a try/catch. On failure:

1. Log the error with structured metadata (no raw prompt in logs)
1. Return a typed `AgentError` object to the pipeline
1. Pipeline aborts and returns `GENERATION_FAILED` to the router
1. User is shown a retry option; no crash

-----

## 6. tRPC API Layer

### Procedure Definitions

#### `composer.generate`

```typescript
input: z.object({
  prompt:        z.string().min(3).max(500),
  genre:         GenreEnum,
  mood:          MoodEnum,
  bpm:           z.number().int().min(60).max(200).optional(),
  key:           KeyEnum.optional(),
  timeSignature: TimeSignatureEnum.default('4/4'),
})

output: z.object({
  compositionId: z.string().uuid(),
  composition:   CompositionSchema,
  lowConfidence: z.boolean(),
  generationMs:  z.number(),
})
```

#### `composer.regenerate`

```typescript
input: z.object({
  compositionId: z.string().uuid(),
  keepHarmony:   z.boolean().default(false),
  keepMelody:    z.boolean().default(false),
  keepRhythm:    z.boolean().default(false),
})

output: // same as generate
```

#### `projects.create`

```typescript
input: z.object({
  name:          z.string().min(1).max(100),
  tags:          z.array(z.string().max(30)).max(10).default([]),
  compositionId: z.string().uuid().optional(),
})

output: z.object({
  projectId: z.string().uuid(),
  project:   ProjectSchema,
})
```

#### `exports.exportMidi`

```typescript
input: z.object({
  compositionId: z.string().uuid(),
  exportType:    z.enum(['melody', 'chords', 'drums', 'full']),
})

output: z.object({
  exportId:    z.string().uuid(),
  downloadUrl: z.string().url(),
  expiresAt:   z.string().datetime(),
  fileSizeBytes: z.number(),
})
```

#### `copilot.analyze`

```typescript
input: z.object({
  compositionId: z.string().uuid(),
})

output: z.object({
  analysisId: z.string().uuid(),
  analysis:   CopilotAnalysisSchema,
  analysisMs: z.number(),
})
```

### tRPC Client (Frontend)

```typescript
// apps/web/src/lib/trpc.ts
import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '@r3/server'

export const trpc = createTRPCReact<AppRouter>()
```

Auth headers are injected via the existing `getAuthHeaders()` utility that reads from `useAuthStore.getState().token`.

-----

## 7. Database Layer

### ORM & Migration Rules

- Drizzle ORM with `drizzle-kit` for migrations
- All migrations live in `packages/db/drizzle/` with a valid migration journal
- Schema changes always produce a new migration file — never edit applied migrations
- Before any `drizzle-kit push`, run `pnpm tsc --noEmit` to catch type errors
- Table names: `snake_case`, plural
- Column names: `snake_case`
- All primary keys: UUID (`gen_random_uuid()`)
- All timestamps: `timestamptz`, defaulting to `now()`

### New Tables (summary)

See **Database Design Document** for full column-level specification.

|Table                 |Purpose                                                |
|----------------------|-------------------------------------------------------|
|`compositions`        |Core generation output: key, BPM, JSON blobs per engine|
|`tracks`              |Individual instrument lanes within a composition       |
|`projects`            |Named containers linking user → compositions           |
|`project_compositions`|Join table: project ↔ composition                      |
|`composition_versions`|Snapshots (project state at a point in time)           |
|`exports`             |MIDI export records with storage URL and metadata      |
|`style_profiles`      |User-saved genre/mood/BPM preference sets              |
|`audit_logs`          |Append-only mutation log                               |

### Query Patterns

**Load project with latest composition:**

```sql
SELECT p.*, c.*
FROM projects p
LEFT JOIN project_compositions pc ON pc.project_id = p.id
LEFT JOIN compositions c ON c.id = pc.composition_id
WHERE p.id = $1
  AND p.deleted_at IS NULL
ORDER BY pc.created_at DESC
LIMIT 1
```

**Optimistic locking on project save:**

```typescript
await db
  .update(projects)
  .set({ updatedAt: new Date(), version: sql`version + 1` })
  .where(
    and(
      eq(projects.id, projectId),
      eq(projects.version, expectedVersion)
    )
  )
// rowCount === 0 → version conflict → throw ConflictError
```

-----

## 8. MIDI Engine

### Package: `packages/midi`

The MIDI engine serializes `Composition` objects to binary MIDI 1.0 files. It does not depend on any AI package — it is a pure data transformation layer.

### Dependencies

```json
{
  "dependencies": {
    "jsmidgen": "^0.1.5"
  }
}
```

### Serialization Strategy

|Track |MIDI Channel|Notes                                                            |
|------|------------|-----------------------------------------------------------------|
|Melody|1           |Note-on/off events from `MelodyResult.notes`                     |
|Chords|2           |Simultaneous note-on for all chord MIDI notes                    |
|Drums |10          |GM drum map: kick=36, snare=38, closed HH=42, open HH=46, clap=39|

### Tempo Map

Tempo is embedded as a MIDI meta event at tick 0:

```
microsecondsPerBeat = Math.round(60_000_000 / bpm)
```

### Validation

Before writing, the serializer runs a structural validation pass:

- All note pitches are 0–127
- All velocities are 0–127
- No overlapping notes on the same channel/pitch
- File size is non-zero

Validation errors throw `MidiSerializationError` with a structured message. They never silently produce a corrupt file.

-----

## 9. Authentication & Authorization

### Token Strategy

Consistent with the existing R3 auth system:

|Token        |Key       |Storage                            |Expiry |
|-------------|----------|-----------------------------------|-------|
|Access Token |`r3_token`|`useAuthStore` (Zustand, in-memory)|7 days |
|Refresh Token|—         |HttpOnly cookie                    |30 days|

### Route Authorization

All Composer tRPC procedures use the existing `protectedProcedure` base:

```typescript
export const composerRouter = router({
  generate: protectedProcedure
    .input(GenerateInputSchema)
    .mutation(async ({ ctx, input }) => {
      // ctx.user is guaranteed by protectedProcedure
      // ...
    })
})
```

### RBAC

|Role   |Permissions                                     |
|-------|------------------------------------------------|
|`user` |Full access to own projects/compositions/exports|
|`admin`|Full access + audit log read + user management  |

Resource ownership is enforced at the query level — every query includes `WHERE user_id = ctx.user.id`.

-----

## 10. State Management

### Zustand Stores

Three new stores, following existing patterns (no Redux, no `any`):

#### `useComposerStore`

```typescript
interface ComposerStore {
  // State
  prompt:        string
  genre:         Genre | null
  mood:          Mood | null
  bpm:           number | null
  key:           Key | null
  composition:   Composition | null
  isGenerating:  boolean
  error:         string | null

  // Actions
  setPrompt:     (prompt: string) => void
  setParams:     (params: Partial<ComposerParams>) => void
  setComposition:(c: Composition) => void
  setGenerating: (v: boolean) => void
  setError:      (e: string | null) => void
  reset:         () => void
}
```

#### `useProjectStore`

```typescript
interface ProjectStore {
  projects:       Project[]
  activeProject:  Project | null
  isLoading:      boolean

  setProjects:    (p: Project[]) => void
  setActive:      (p: Project | null) => void
  setLoading:     (v: boolean) => void
  upsertProject:  (p: Project) => void
  removeProject:  (id: string) => void
}
```

#### `useCopilotStore`

```typescript
interface CopilotStore {
  analysis:    CopilotAnalysis | null
  isAnalyzing: boolean
  error:       string | null

  setAnalysis:  (a: CopilotAnalysis | null) => void
  setAnalyzing: (v: boolean) => void
  setError:     (e: string | null) => void
}
```

-----

## 11. Error Handling Strategy

### Frontend

All tRPC errors are caught with `onError` callbacks or React Query’s `error` state. The UI displays:

- Toast notification for transient errors (generation failure, network error)
- Inline field error for validation failures
- Full-page error state for unrecoverable errors (auth failure)

Never display raw error messages from the server to the user. Map error codes to user-friendly strings in `packages/shared/src/errorMessages.ts`.

### Backend

```typescript
// Structured error wrapper used across all routers
import { TRPCError } from '@trpc/server'

function throwComposerError(code: ComposerErrorCode, detail?: string): never {
  throw new TRPCError({
    code:    trpcCodeMap[code],
    message: code,
    cause:   detail,
  })
}
```

All errors are logged with:

- `errorCode`
- `userId` (if authenticated)
- `traceId` (UUID generated per request)
- `timestamp`
- Stack trace (never exposed to client)

-----

## 12. Caching Strategy

### Style Profile Cache

User style profiles are cached in Redis with a 1-hour TTL. Cache is invalidated on profile update.

```
Key:   style_profile:{userId}
TTL:   3600s
Value: JSON-serialized StyleProfile
```

### Composition Cache

Generation results are not cached — each request is unique. However, the `promptParser` output (intent + style vector) is cached per `(prompt, genre, mood)` tuple with a 15-minute TTL to avoid redundant AI calls for identical inputs.

```
Key:   prompt_parse:{sha256(prompt+genre+mood)}
TTL:   900s
Value: JSON-serialized ParsedIntent
```

### MIDI Export Cache

Generated MIDI files are stored in object storage (Railway Volumes or S3-compatible). The `downloadUrl` is a signed URL with a 90-day expiry. Re-export of the same `compositionId` + `exportType` returns the existing signed URL if the export record exists and the file is within its retention window.

-----

## 13. Testing Strategy

### Unit Tests (`packages/ai`, `packages/midi`)

|Test                  |What it covers                                                  |
|----------------------|----------------------------------------------------------------|
|`harmonyAgent.test.ts`|Schema validation; key/chord output correctness for known inputs|
|`melodyAgent.test.ts` |Note range; rhythmic validity; key adherence                    |
|`rhythmAgent.test.ts` |Pattern length; loop safety; tempo alignment                    |
|`serializer.test.ts`  |MIDI binary output; GM drum map; tempo meta event               |
|`validator.test.ts`   |Pitch/velocity bounds; overlap detection                        |

Agents are tested with **mocked Anthropic responses** — no live API calls in CI.

### Integration Tests (`packages/server`)

Each tRPC router has an integration test suite using an in-memory test database (PostgreSQL spun up with `pg-mem` or Docker Compose).

### E2E Tests

Playwright test suite in `apps/web/e2e/`:

```
e2e/
├── composer-flow.spec.ts   ← Full generation → export flow
├── project-save.spec.ts    ← Save and reload state
├── auth-flow.spec.ts       ← Existing; extended for composer routes
└── error-states.spec.ts    ← Invalid inputs; API failures
```

### Coverage Enforcement

```json
// vitest.config.ts
{
  "coverage": {
    "thresholds": {
      "lines":     80,
      "functions": 80,
      "branches":  75
    },
    "exclude": ["**/*.test.ts", "**/index.ts", "**/__mocks__/**"]
  }
}
```

-----

## 14. Deployment Architecture

### Platform: Railway

The Composer feature deploys as part of the existing Railway project. No new services are required for v1.0.

```
Railway Project: r3-stable
├── Service: web (Vite build → static)
├── Service: api (Express + tRPC)
│   └── New env vars required:
│       ANTHROPIC_API_KEY        (existing)
│       COMPOSER_RATE_LIMIT_RPM  (default: 10)
│       MIDI_EXPORT_TTL_DAYS     (default: 90)
├── Service: postgres (existing)
└── Service: redis (existing; add if not present)
```

### New Environment Variables

|Variable                       |Required|Default|Description                                |
|-------------------------------|--------|-------|-------------------------------------------|
|`ANTHROPIC_API_KEY`            |Yes     |—      |Existing; used by LLPTE and Composer agents|
|`COMPOSER_CONFIDENCE_THRESHOLD`|No      |`0.65` |Style-match gate                           |
|`COMPOSER_RATE_LIMIT_RPM`      |No      |`10`   |Generation requests per minute per user    |
|`MIDI_EXPORT_TTL_DAYS`         |No      |`90`   |Signed URL and file retention              |
|`COMPOSER_MAX_GENERATION_MS`   |No      |`30000`|Hard timeout on pipeline                   |

### Migration Deployment

Before each deploy:

1. `pnpm drizzle-kit generate` — confirm no unexpected changes
1. `pnpm drizzle-kit migrate` runs as a pre-deploy hook
1. If migration fails, deploy is blocked

-----

## 15. Engineering Standards

All Composer code must comply with the project-wide WIRE.txt protocol:

|Rule                  |Detail                                                                |
|----------------------|----------------------------------------------------------------------|
|Read before write     |Always `view` the target file before any edit                         |
|No `any`              |TypeScript strict mode; all types explicit                            |
|No `console.log`      |Use the structured logger; never commit `console.log`                 |
|No Redux              |Zustand only for client state                                         |
|No react-router-dom   |Wouter only for routing                                               |
|JWT key               |`r3_token` — no other key name                                        |
|Post-login redirect   |`/instrument` (existing flow; Composer accessible from nav)           |
|Migration safety      |Never edit an applied migration file                                  |
|Dry-run defaults      |Destructive scripts default to `--dry-run`; require explicit `--apply`|
|TSC verify            |`pnpm tsc --noEmit` must pass after every write                       |
|Backup before patching|Timestamped backup before any patch script runs                       |
|Assert guards         |Python patch scripts: `assert count == 1` before any substitution     |