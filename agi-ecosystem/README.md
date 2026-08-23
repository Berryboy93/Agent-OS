# AGI Ecosystem v2.0 — Production Grade

## Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    CIVILIZATION ORCHESTRATOR              │
│              (Long-horizon coordination)                  │
├─────────────────────────────────────────────────────────┤
│                    SIMULATION ENGINE                      │
│         (Counterfactual evaluation / branching)           │
├─────────────────────────────────────────────────────────┤
│                    MYTHOS POLICY ENGINE                   │
│              (Policy enforcement / DSL)                   │
├─────────────────────────────────────────────────────────┤
│                    DAG COMPILER                           │
│         (Planning + dependency resolution)                │
├─────────────────────────────────────────────────────────┤
│                    AGENT OS RUNTIME                       │
│    (Sandboxed execution / capability checks)            │
├─────────────────────────────────────────────────────────┤
│                    SWARM RUNTIME                          │
│         (K8s distributed execution nodes)               │
├─────────────────────────────────────────────────────────┤
│                    EVENT STORE                            │
│         (Immutable append-only logs)                    │
└─────────────────────────────────────────────────────────┘
```

## Quick Start
```bash
# Install dependencies
pnpm install

# Start infrastructure (Postgres, Kafka, Redis)
pnpm infra:up

# Build all packages
pnpm build

# Run tests
pnpm test

# Deploy to local K8s
pnpm k8s:apply
```

## Packages
| Package | Purpose | Status |
|---------|---------|--------|
| `dag-compiler` | DAG planning & validation | ✅ Production |
| `agent-os-runtime` | Sandboxed execution kernel | ✅ Production |
| `mythos-policy-engine` | Policy DSL parser & evaluator | ✅ Production |
| `event-store` | Immutable append-only log | ✅ Production |
| `swarm-runtime` | K8s distributed execution | ✅ Production |
| `simulation-engine` | Counterfactual branching | ✅ Production |
| `civilization-orchestrator` | Long-horizon coordination | ✅ Production |

## Safety Guarantees
- Mythos overrides all layers
- No direct agent privilege escalation
- No bypass of DAG compiler
- Full traceability required
- Deterministic replay mandatory
