# Bug & Gap Audit — 2026-04-20 Doc Refresh Bundle

Adversarial review of:
- `install_docs.py`
- The 7 generated docs in this bundle
- The underlying claims, cross-referenced against `codebase_tree.txt`

Severity legend:
- **🔴 HIGH** — wrong claim users will rely on
- **🟡 MEDIUM** — ambiguous, stale, or likely wrong
- **🟢 LOW** — cosmetic / style / easily fixed

---

## `install_docs.py` — Bugs

### 🟡 MEDIUM-1: `--force` + existing ADD file shows "ADD" in plan but silently replaces

**Repro:** `SESSION_2026-04-20.md` already exists in dest; user passes `--force`; plan still prints `ADD` for it, but in the write loop it's overwritten.

**Impact:** Plan output misleads on overwrite. No data lost (backup exists).

**Fix:** In plan-printing loop for `ADD_FILES`, check `d.exists()` and label accordingly.

```python
for f in ADD_FILES:
    s = src / f
    d = dest / f
    if d.exists():
        print(f"  OVERWRITE {f:<24} {sha256(d)} -> {sha256(s)} (ADD target exists, --force)")
    else:
        print(f"  ADD      {f:<24} (new, sha {sha256(s)})")
```

### 🟢 LOW-1: `BrokenPipeError` when output is piped to `head` / `less`

**Repro:** `python3 install_docs.py | head -20` → Python raises BrokenPipeError on final prints.

**Impact:** Cosmetic. Script has already done its job. Only visible in dry-run mode.

**Fix:** Top of `main()`:
```python
import signal
signal.signal(signal.SIGPIPE, signal.SIG_DFL)
```

### 🟢 LOW-2: Uses `os.environ["HOME"]` instead of `Path.home()`

**Impact:** None on Linux. Would break on Windows. User is on ChromeOS Linux → no real issue.

**Fix:** Replace with `Path.home()` for portability.

### 🟢 LOW-3: No `.gitignore` guidance for `.docs-backup-*`

**Repro:** Script creates `~/Stable/.docs-backup-<ts>/`. If `.gitignore` doesn't cover this pattern, `git status` will show the whole backup tree.

**Fix:** Before committing, ensure `.docs-backup-*` is in `.gitignore`. Script could suggest this in its post-run output. (Current .gitignore content unknown from the snapshot — verify on your end.)

### Verified correct
- Dry-run-by-default: ✓ tested
- SHA256 verification post-write: ✓ tested
- Abort on missing source file (exit 2): ✓ tested
- Abort on missing dest dir (exit 2): ✓ tested
- Full tree backup before any write: ✓ tested
- Idempotent re-run (SKIPs identical files): ✓ tested
- Protected paths preserved: ✓ tested (PRD.pdf, LLPTE/, infra/, and 17 other files survived)

---

## Docs — Content Accuracy Bugs

### 🔴 HIGH-1: `services/ai-mix` architecture description is ambiguous/wrong

**Where:**
- `README.md` line: `services/ai-mix/            # AI Mix sidecar (TS + optional Python)`
- `AI_MIXING.md`: *"A Python sidecar exists at `services/ai-mix/` for heavier, non-realtime analysis (e.g. offline mastering preview). It is not called from the LLPTE tick loop."*

**Reality** (from `codebase_tree.txt`):
- `services/ai-mix/` contains both `AIMixingService.ts` AND `ai_mix.py`, `app.py`, `main.py`
- `server/routers/aiMix.router.ts` imports the **TS class directly**: `new AIMixingService()` — in-process
- `server/services/aiMixClient.ts` is a **typed HTTP client** for the Python side, expecting `AI_MIX_URL` (default `http://localhost:8001`), hitting `/mix/analyze`
- Whether the Python sidecar is actually deployed anywhere is not verifiable from the tree
- The claim "offline mastering preview" is **pure speculation** I inserted — has no basis in code

**What the docs should say:**
- `services/ai-mix/` contains a TypeScript `AIMixingService` class (used in-process by `aiMix.router.ts`) AND a parallel Python implementation (Dockerfile, requirements.txt, FastAPI-style `app.py`) reachable via `aiMixClient.ts` if `AI_MIX_URL` is set
- Deployment status of the Python sidecar is TBD — no confirmation it runs anywhere in production
- Do NOT claim Python is "for offline mastering preview" — that's speculation

**Remediation:** rewrite these two passages.

### 🔴 HIGH-2: Broken reference — `docs/WIRE.txt` is cited 4 times but does not exist

**Where cited:**
- `CLAUDE.md` L23: *"No write without read first (Wire.txt protocol — see docs/WIRE.txt)"*
- `CLAUDE.md` L228: *"See `docs/WIRE.txt` for full protocol"*
- `README.md` L192: *"All engineering work follows **Wire.txt Protocol** (`docs/WIRE.txt`)"*
- `SALE_PACKAGE.md` L52: *"WIRE.txt (engineering protocol) | ✅"*

**Reality:**
- No `WIRE.txt` file in `docs/` (confirmed via snapshot)
- Codebase tree contains `/home/r3v/Stable/r3wire.py` — a Python utility, not the protocol doc
- The "Wire.txt protocol" is a convention referenced in code comments but has no authoritative written source

**Remediation options:**
1. Write the actual `docs/WIRE.txt` (extract from existing code comments and user memory)
2. Change references to say "Wire.txt protocol — see `CLAUDE.md` §Wire.txt Protocol" (self-reference)
3. Stop referencing it as an external doc

**This is a pre-existing issue in the original docs that I preserved.** Worth fixing now.

### 🔴 HIGH-3: Broken reference — `docs/DEMO_CHECKLIST.md` does not exist

**Where cited:**
- `CLAUDE.md` L212: *"See `docs/DEMO_CHECKLIST.md` for full pre-demo QA."*
- `README.md` L180: *"`docs/DEMO_CHECKLIST.md` | Pre-demo QA checklist (17 items)"*
- `SALE_PACKAGE.md` L57: *"DEMO_CHECKLIST.md (pre-investor QA) | ✅"*
- `CLAUDE_local.md` L78: *"DEMO_CHECKLIST.md created in docs/DEMO_CHECKLIST.md"*
- `PRIORITIES.md` L123: completed item says it was created

**Reality:**
- Not in the docs snapshot
- Not in codebase tree (zero matches for `DEMO_CHECKLIST`)
- Either: (a) was created locally but never committed, (b) was deleted, or (c) was never actually made despite PRIORITIES saying so

**Remediation options:**
1. Create a stub `docs/DEMO_CHECKLIST.md` with the 17 items from user memory
2. Remove all references until it exists
3. Mark as `[ ] TODO` in PRIORITIES instead of `[x] DONE`

**Also preserved from original.** Marking Session-3 completion as done when the artifact doesn't exist is a correctness issue in the ledger.

### 🟡 MEDIUM-1: Session numbering renumbered without justification

**What changed:**
- Original `PRIORITIES.md` called 2026-04-12 "Session 2" and 2026-04-09 "Session 1"
- My rewrite calls them Session 3 and Session 2 respectively, with today = Session 4

**Why it's wrong:** User memory suggests there were multiple earlier sessions (Smart Transitions work, auth stabilization, etc.) before the PRIORITIES ledger started being kept. The original numbering may already have been off. But renumbering silently without stating why breaks continuity with any external notes referencing "Session 1" or "Session 2".

**Remediation:** Restore original numbering and label today as "Session N (by date, not number)" — or just drop numbers entirely and rely on dates.

### 🟡 MEDIUM-2: "42+ Vitest tests" claimed as fact; PRIORITIES says suite doesn't run

**Where claimed:**
- `README.md`: "42+ Vitest test cases"
- `AI_MIXING.md`: "42+ Vitest cases across LLPTE packages"
- `SALE_PACKAGE.md`: "42+ Vitest tests"

**Where contradicted:**
- `PRIORITIES.md` (P4): *"`pnpm test` returns no output. Actual test count unknown. PRD cites 42+."*

**Impact:** Sales collateral states a number as fact while internal priorities admit the number is unverified. Buyer due diligence would catch this.

**Remediation:** Qualify in README and SALE_PACKAGE: *"42+ Vitest cases documented across LLPTE packages; vitest root config needs correction before the full suite runs from monorepo root (tracked as P4)."*

### 🟡 MEDIUM-3: Admin Agent Suite and Telegram agent — no mention in updated docs

**Context from user memory:**
- `r3v4_agi_fixed.html` — Admin Agent Suite with staged but unconfirmed patch, mid-flight
- `r3agent.py` — Telegram-to-SSH agent, setup left incomplete

**Where they should appear:**
- `CLAUDE_local.md` §Pending Actions — currently absent
- `PRIORITIES.md` — should be tracked somewhere (P3 or P5)

**Remediation:** Add a P3/P5 entry for each, even if just "review and decide: finish, park, or remove".

### 🟡 MEDIUM-4: "WebSocket Real-time Collaboration ✅ Wired" is code-verified but not product-verified

**Code evidence (checked):**
- `server/ws/collab.ts`, `server/ws/SessionBroadcaster.ts` exist
- `attachCollabServer`, `getRoomStats` imported and called in `server/index.ts`
- `client/src/pages/collaborative-daw-pro.tsx` exists
- E2E test at `tests/e2e/websocket.spec.ts`

**What's not verified:**
- Whether collab actually works end-to-end with two clients in production
- Whether the Elite-tier `collab.roomStats` procedure returns real data

**Remediation:** Qualify in SALE_PACKAGE: *"WebSocket collab plumbing wired (server/ws/, collaborative-daw-pro.tsx, E2E test); multi-user production verification pending"*. README claim is OK since it's a feature overview, not a warranty.

### 🟢 LOW-1: `bcrypt` in tree, but memory says bcryptjs on Termux

**Finding:** All package.json files show `bcrypt ^6.0.0`. Memory says: "bcrypt native binary failures on Android arm64 (replaced with bcryptjs)."

**Likely reality:** The primary server on Penguin/Linux uses bcrypt 6.0.0. Termux development used bcryptjs as a local swap. The committed `package.json` has bcrypt, not bcryptjs.

**Impact:** If you deploy on arm64 (e.g. AWS Graviton or some Railway regions), you may hit the same binary issue. Worth noting as an ops caveat somewhere.

**Remediation:** Add a note to DEVELOPMENT.md (not touched this session) — "bcrypt native requires x86_64 or a specific arm64 build; bcryptjs is a drop-in if building on unusual arches."

---

## Gaps — Things the docs don't cover but should

### 🟡 G-1: Stripe billing live status

My updated docs correctly flag "schema wired, live status TBD" — but no runbook for actually verifying live status. A ~10-line checklist in `CLAUDE_local.md` would close this:

```
# Verify Stripe live round-trip
1. stripe login (CLI)
2. stripe listen --forward-to localhost:3000/api/stripe/webhook
3. stripe trigger customer.subscription.created
4. Check server logs for 200 ack
5. Check DB: SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 1
6. Check stripe_events table for idempotency row
```

### 🟡 G-2: The 17-item pre-demo QA checklist (per user memory)

No written artifact exists. If it's only in your head, you can't run it deterministically and a buyer can't audit it. Stub it now; populate later.

### 🟡 G-3: Security response runbook

Given Dependabot shows 4 high-severity items and no doc tells the next-on-call how to triage them, this is worth 20 lines in `DEVELOPMENT.md` or a new `SECURITY.md`.

### 🟢 G-4: `@r3vibe` package scope — claimed in SALE_PACKAGE, minimally documented

Scope exists in package.json files (I verified: `@r3vibe/server`, `@r3vibe/client` both present). Worth a one-line description of why the scope exists and whether it's publishable or internal-only.

### 🟢 G-5: `$AI_MIX_URL` env var

If the Python sidecar is real, it needs to appear in `README.md` env table. Currently absent.

---

## Triple-check summary

**What I verified this pass:**
- Every file in the docs snapshot is accounted for in PROTECTED_GLOBS or REPLACE_FILES of the installer
- Script abort paths return exit code 2
- The 11-package monorepo claim is correct (1 root + 10 workspace packages)
- `@r3vibe` package scope is real
- bcrypt is in tree at 6.0.0
- LemonSqueezy fully gone from tree (zero matches)
- `services/ai-mix` is more complex than I first described — corrected above

**What I could not verify:**
- Whether `AIMixingService.ts` calls HTTP or runs in-process (source not in codebase_tree.txt sections — need to view it directly in `~/Stable`)
- Whether vitest suite runs and returns 42+ passing
- Whether Python sidecar is deployed anywhere
- Whether Stripe billing processes a live subscription
- .gitignore contents (not in snapshot)

**What I recommend fixing now (pre-install):**
1. 🔴 HIGH-1: `services/ai-mix` description in README + AI_MIXING
2. 🔴 HIGH-2: WIRE.txt references — either create the file or redirect to CLAUDE.md §Wire.txt
3. 🔴 HIGH-3: DEMO_CHECKLIST.md references — either create a stub or remove claims of done
4. 🟡 MEDIUM-1: Session numbering — revert to match original numbering or drop numbers

**What can ship as-is, flagged for next session:**
- 🟡 MEDIUM-2/3/4 items
- 🟢 All LOW items
- All gaps (G-1 through G-5)

---

## Installer status

**The installer as shipped is safe and correct.** The 3 bugs in it are cosmetic/style and do not risk data loss. The backup-before-write + SHA verification + protected-path post-flight are all tested.

You can safely run `python3 install_docs.py --apply` today and then come back for a second round to fix the HIGH/MEDIUM doc issues.

*OR*

If you want the HIGH doc issues fixed first, tell me and I'll produce a v2 bundle in the same shape — same installer, same file list, but with HIGH-1/2/3 and MEDIUM-1 resolved.
