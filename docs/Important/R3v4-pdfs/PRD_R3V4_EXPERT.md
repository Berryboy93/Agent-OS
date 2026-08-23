# R3v4: Pro-Grade AI Browser DAW
**Product Requirements Document (PRD)**  
Version: v4.2.0 (2026-04-29)  
Author: [Your Team]  
Reference: CLAUDE.md, docs/R3v4_PRD_v4.1.pdf, SKILLS.md, repo tree, canonical code patterns

---

## 📐 1. Project Scope & Mission

**Mission:**  
Deliver a fully browser-based DAW that sets a new standard for speed, clarity, musical intelligence, and live instrument UI.  
- Hybrid AI-First: AI as creative collaborator, not just an assist tool  
- Production-Grade: Zero drift between type contract, UI, data, and musical intent  
- Extensible & Modular: Built for future integrated node-based VJ and multiplayer DAW features.

---

## 🛠 2. Stack and Unbreakable Architecture Rules

**Tech Stack (✱ = Hard Guard in codebase):**  
| Area           | Library/Standard                 | Version/Pinned      | Notes                         |
|----------------|----------------------------------|---------------------|-------------------------------|
| Language       | TypeScript ✱                     | 5.9.3               | No `any` except whitelisted   |
| UI Framework   | React ✱                          | 18.x                | Functional components only    |
| State          | Zustand ✱                        | 4.x                 | No Redux                      |
| Routing        | Wouter ✱                         | 2.x                 | No react-router-dom           |
| Styling        | TailwindCSS ✱                    | 4.2.4               | *darkMode: 'class'*           |
| Theme System   | CSS Variables via theme.css ✱    | —                   | Neon/Acid default palette     |
| Package Mgmt   | pnpm ✱                           | 10.33.x             | Monorepo workspace setup      |
| Auth           | JWT                              | —                   | No session cookies            |
| Payments       | Stripe ✱                         | 20.4.1              | No alt vendor refs            |
| ORM/DB Client  | drizzle-orm                      | 0.39.3              | See migration rules           |
| DB             | PostgreSQL                       | ≥14.x (Railway)     | Split DB, never SQLite        |
| Audio          | Web Audio API                    | —                   | All analysis in browser       |
| Realtime       | ws                               | 8.20.0              | Collab, control, VJ sync      |
| Testing        | Vitest                           | 1.6.1               | ≥42 cases, piped to CI        |
| Node           | Node.js ✱                        | 22.x (LTS)          | Critical for all CLI          |

**Workspace Rules:**  
- All dev on Kali, no code/patches authored on Chromebook/Termux.
- All patch scripts must be read-then-write, never blind apply (Wire Protocol).

---

## 🧩 3. Product & App Architecture

### 3.1 Monorepo Layout  
```
/
  client/
    src/
      context/             # ThemeProvider, DAW providers
      components/
      pages/
      hooks/
      styles/
    config/
    stores/
    shared/
  server/
    db/
    routers/
    services/
    routes/
    trpc.ts
  shared/                  # Universal types, schema, adapters
  packages/llpte-*         # Individual AI/Mix/Pipeline packages
  tests/
  tools/                   # Patch, audit, automation scripts
```
- No imports across phantom dirs (see hygiene baseline).  
- Only one source of truth for Tailwind config, theme tokens, palette.

### 3.2 Canonical Pipeline (LLPTE — Locked)  
```
inputRouter → spectralAnalyzer → aiMixEngine → transitionGraph → outputBus
```
- Node order must never change (locked in PRD + Charter)
- Each node exposes hooks for live visual intelligence layer

---

## 🎨 4. UI & Theming Contract

**4.1 Style Union (Enforced):**  
- **Base:** Black (`#000`), soft white (`#eaeaea`)
- **Accent:** Neon lime (`#bfff00`), soft neon (`#dfff66`), border glow  
- **No random greens**: Only neon palette allowed
- **Theme Switcher:** Only two themes: `dark` (default), `light`
- UI colors must reflect canonical tokens (`bg-background`, `border-border`, etc.)

**4.2 Neon Effects:**  
- Buttons, panels, indicators: `neon-border`, `neon-panel`, `.neon-hover` classes
- Only use `box-shadow` and `border-color` for glow, never inline RGB hack
- Animation speed: Default 220ms. No infinite blur spam.

**4.3 Audio/Beat/Section/VJ Integration:**  
- UI livesyncs to: master output, active tracks, beat, bar, drop, and MIDI
- Use global context: `useVisualIntelligence`, `useAudioReactivity`, `useMusicClock`

**4.4 Accessibility:**  
- All live themes pass WCAG AA for contrast on both backgrounds  
- Focus rings: Neon, always visible

---

## ⚡ 5. AI, Visual, and Realtime Intelligence

| Layer                     | Function                                | Requirement           |
|---------------------------|-----------------------------------------|-----------------------|
| Audio Analyzer            | Level, waveform, FFT bands              | 60fps, smoothed       |
| Beat Clock                | Beat/bar/phrase counters                | BPM lock, 4/8/16 bar  |
| Drop Detector             | Energy spike → UI explosion             | Smoothing, 20ms delay |
| Section Detection         | AI classifies verse/build/drop          | Heuristics + ML       |
| Visual Intelligence Layer | Aggregates signals, feeds VJ/reactive UI| Central, not per-comp |
| MIDI Handler              | Per-user, per-session, triggers UI      | Web MIDI, low-latency |
| Node-Based VJ Graph       | Shader logic built visually             | ReactFlow + WebGL     |
| Collaborative Editing     | CRDT graph (Yjs) w/ undo                | Multi-user, no merge  |

- VJ visuals (WebGL shader canvas) driven by VIL data, not React state  
- AI copilots allowed, but must patch via diff/patch system, not raw writes

---

## 💸 6. Monetization & User Flow

| Tier         | Feature Locks                                  | Enforcement             |
|--------------|------------------------------------------------|-------------------------|
| explorer     | Limited tracks, basic AI, branding             | Stripe/canonical only   |
| creator      | Full tracks/effects, MIDI, DAW/VJ collab       | Stripe validated        |
| pro_artist   | All features, multiplayer, live visuals, export| Stripe, audit required  |

- On login: always redirect `/instrument`, never `/daw`.
- Stripe is the only payment gateway (no alt vendors).
- No “Pro” or “Studio” strings — only `creator` or `pro_artist`.

---

## 🧑‍💻 7. Dev/Test/Deployment Protocols

1. **Zero Drift Rule:**  
   - `pnpm tsc --noEmit` must return zero errors after any patch (see CLI guard in CLAUDE.md)
   - Patch scripts must perform read-first (Wire.txt protocol)
2. **Theme Preflight:**  
   - Before every deploy, run grep across all UI for non-token colors
3. **Config Lock:**  
   - Only one live `tailwind.config.ts` in client root
4. **Multi-Env Guards:**  
   - No dev on Termux/Penguin except isolated UI run
   - `.env` DB_URL must always be manually verified (Railway only)
5. **CRDT/Realtime Layer:**  
   - All multiplayer/VJ graph state is Yjs-CRDT, never plain Zustand or raw WebSocket
6. **AI Integrations:**  
   - All AI code must use `type: "ai.generate" | "ai.modify"` meta nodes for graph patches (never raw mutation)

---

## ⚠️ 8. Hygiene & Canonical Violations

- NO: `bg-black`, `text-white`, `border-green-500` (except in inline DAW core palette by explicit design).
- NO: Direct color hex in className props outside `styles/theme.css` or DAW core.
- NO: Committing console.log — use structured logging everywhere.
- NO: `any` types — must use `unknown` with guard, unless CLAUDE-exempt file.
- NO: Phantom directories — never new UI in client/client, client/src/context(s), etc.
- NO: Multiple tailwind configs — only client/tailwind.config.ts is canonical.
- DO: ESLint + TS strict enforced before any merge.

---

## 🚀 9. Roadmap: Next-Level Features (Modular Plan)

**Immediate**
- Neon/Acid theme full migration (~1d)
- Theme/dark mode indicator multi-pass audit
- Audio reactivity engine, beat/section detection
- Node-based VJ visual composer (single-user)

**Staged**
- Multiplayer collaborative VJ for ≥pro_artist
- AI co-creator nodes (backed by codegen/LLM)
- Live drop detection w/ visual cues
- Visual automation lanes for modulation
- Preset system for VJ patches/scenes

---

## 📎 10. Appendix: Canonical Color/Theme Token Map

```
--bg:           #000000
--fg:           #eaeaea
--neon-lime:    #bfff00
--neon-lime-soft: #dfff66
--border:       #bfff00
--panel:        #050505
--glow-1:       0 0 4px #bfff00
--glow-2:       0 0 8px #bfff00, 0 0 16px #bfff00
--glow-3:       0 0 12px #bfff00, 0 0 24px #bfff00, 0 0 48px #bfff00
```

---

*This PRD must be reviewed alongside `CLAUDE.md` and `SKILLS.md` before every feature or patch. No deviations permitted without RFC and maintainer review.*