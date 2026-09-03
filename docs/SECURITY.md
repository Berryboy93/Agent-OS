# Security Policy — Agent-OS

## Audit Surface

| Component | Risk Level | Notes |
|---|---|---|
| `@agent-os/adapters` (AnthropicAdapter, OpenAIAdapter) | HIGH | Holds API keys, sends user data to external LLM providers |
| `@agent-os/events` (EventStore) | HIGH | Persists all agent I/O including potential PII; 5-stage redaction required |
| `@agent-os/runtime` (worker threads) | MEDIUM | Executes agent logic in isolation; `resourceLimits` prevent runaway memory |
| `@agent-os/db` (SQLite / Postgres) | MEDIUM | Stores run records, checkpoints, credentials must not appear in plaintext |
| `apps/dashboard` (Express server) | MEDIUM | Exposes SSE stream, API endpoints; no auth in v1 (localhost/private only) |
| `@agent-os/cli` (`agos` commands) | LOW | Reads env vars, connects to local DB |

## Supported Versions

| Version | Status |
|---|---|
| 2.x (M0–M3) | Active development — security fixes applied immediately |

## Reporting Vulnerabilities

**Do not open a public GitHub issue for security vulnerabilities.**

Email: security@agent-os.example (replace with actual contact)

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

We aim to respond within 72 hours and provide a fix within 14 days for critical issues.

## Known Deferred Controls

| ID | Finding | Target Milestone | REVISIT_BY |
|---|---|---|---|
| SEC-01 | Dashboard has no authentication — access control relies on network-level controls | M2 | 2026-07-01 |
| SEC-02 | BullMQ/Redis not yet deployed — scheduler uses in-memory queue | M1 | 2026-06-01 |
| SEC-03 | Event store redaction covers patterns but not model-level PII detection | M2 | 2026-07-01 |

## Interim Security Controls (v1)

1. `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` must be set via environment variables, never hardcoded
2. `npm audit --audit-level=high` runs in CI on every commit
3. Secret scanning runs in CI — blocks merges with detected secrets
4. All event data passes through the 5-stage redaction pipeline before persistence
5. SQLite WAL mode; no plaintext credentials stored in event data

## Secret Redaction Pipeline

Every `AgentEvent.data` field passes five stages synchronously before DB write:

1. **Pattern scanner** — regex block-list for known secret formats (`sk-ant-*`, `sk-*`, bearer tokens, etc.)
2. **Schema-annotated scrubber** — fields marked `sensitive: true` on `ToolDefinition` inputs are redacted
3. **Entropy detector** — high-entropy strings (≥4.5 bits/char, len≥20) flagged and redacted
4. **PII structural detector** — email addresses, phone numbers, SSN patterns removed
5. **Audit sanitizer** — final pass ensures no raw API keys remain; sets `redaction_incomplete: true` on partial failures rather than blocking

## CI Security Baseline

The following run on every commit (see `.github/workflows/ci.yml`):
- `tsc --noEmit` — zero type errors required
- `eslint` — `@typescript-eslint/no-explicit-any` enforced  
- `npm audit --audit-level=high` — blocks on HIGH or CRITICAL vulnerabilities
- Secret scan (`gitleaks` or equivalent) — blocks on detected secrets
