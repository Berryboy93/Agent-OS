# Agent-OS System Map (R3v4)

## Runtime Spine
- EventBus: packages/runtime/src/event-bus.ts
- Scheduler: packages/runtime/src/scheduler.ts

## State Layers
- Client local state: Zustand (hooks)
- Server sync: tRPC

## Skill System
- Primary skills: .local/skills
- Secondary skills: .local/secondary_skills

## Governance
- WIRE protocol: docs/WIRE.txt + PRD enforcement
- Mutation replay log: WIRE_RESPONSE_MUTATION_REPLAY.md

## Key Risk
- No single authoritative state machine
- Event + state + policy are decoupled

