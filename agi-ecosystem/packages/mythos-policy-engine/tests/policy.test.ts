import { describe, it, expect } from 'vitest';
import { MythosEngine } from '../src/index.js';

const samplePolicy = `
policy {
  rule "no_unapproved_execution" {
    when: pre_execution
    if: risk > threshold
    then: reject
  }

  rule "audit_all_actions" {
    when: any
    then: log_event
  }

  rule "low_trust_quarantine" {
    when: agent_spawn
    if: agent.trust < 0.3
    then: quarantine
  }

  rule "high_value_approval" {
    when: pre_execution
    if: payload.value > 10000
    then: require_approval("human_operator")
  }
}
`;

describe('MythosEngine', () => {
  it('registers and evaluates policies', () => {
    const engine = new MythosEngine();
    engine.registerPolicy('safety', samplePolicy);

    const decision = engine.evaluate('pre_execution', {
      agent_id: 'agent-1',
      session_id: 'session-1',
      risk_score: 0.8,
      trust_level: 0.5,
      payload: { value: 500 }
    });

    expect(decision.allowed).toBe(false);
    expect(decision.rule).toBe('no_unapproved_execution');
  });

  it('allows safe operations', () => {
    const engine = new MythosEngine();
    engine.registerPolicy('safety', samplePolicy);

    const decision = engine.evaluate('pre_execution', {
      agent_id: 'agent-1',
      session_id: 'session-1',
      risk_score: 0.2,
      trust_level: 0.5,
      payload: { value: 100 }
    });

    expect(decision.allowed).toBe(true);
  });

  it('quarantines low-trust agents', () => {
    const engine = new MythosEngine();
    engine.registerPolicy('safety', samplePolicy);

    const decision = engine.evaluate('agent_spawn', {
      agent_id: 'agent-1',
      session_id: 'session-1',
      risk_score: 0.1,
      trust_level: 0.1,
      payload: {}
    });

    expect(decision.allowed).toBe(false);
    expect(decision.action.type).toBe('quarantine');
  });

  it('requires approval for high-value operations', () => {
    const engine = new MythosEngine();
    engine.registerPolicy('safety', samplePolicy);

    const decision = engine.evaluate('pre_execution', {
      agent_id: 'agent-1',
      session_id: 'session-1',
      risk_score: 0.1,
      trust_level: 0.5,
      payload: { value: 50000 }
    });

    expect(decision.action.type).toBe('require_approval');
    expect(decision.action).toHaveProperty('approver', 'human_operator');
  });
});
