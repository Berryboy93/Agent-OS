import { describe, it, expect } from "vitest";
import { MythosEngine } from "../engine.js";
import { parsePolicy } from "../parser.js";
import { PolicyContext } from "../types.js";

const samplePolicy = `
policy {
  rule "no_unapproved_execution" {
    when: pre_execution
    if: risk > 0.8
    then: reject, log_event, escalate
  }

  rule "audit_all_actions" {
    when: any
    then: log_event, audit
  }

  rule "low_trust_sandbox" {
    when: agent_spawn
    if: agent.trust < 0.5
    then: sandbox, notify("security-team")
  }
}
`;

describe("MythosEngine", () => {
  const policy = parsePolicy(samplePolicy);
  const engine = new MythosEngine([policy]);

  it("rejects high-risk execution", () => {
    const context: PolicyContext = {
      eventType: "pre_execution",
      risk: 0.9,
      agentId: "agent-1",
      agentTrust: 0.8,
      action: "compute",
      payload: {}
    };

    const decision = engine.evaluate(context);
    expect(decision.allowed).toBe(false);
    expect(decision.violatedRules).toContain("no_unapproved_execution");
    expect(decision.actions).toContainEqual({ type: "reject" });
  });

  it("allows low-risk execution", () => {
    const context: PolicyContext = {
      eventType: "pre_execution",
      risk: 0.3,
      agentId: "agent-1",
      agentTrust: 0.8,
      action: "compute",
      payload: {}
    };

    const decision = engine.evaluate(context);
    expect(decision.allowed).toBe(true);
    expect(decision.actions.some(a => a.type === "audit")).toBe(true);
  });

  it("sandboxes low-trust agents", () => {
    const context: PolicyContext = {
      eventType: "agent_spawn",
      risk: 0.1,
      agentId: "untrusted-agent",
      agentTrust: 0.2,
      action: "spawn",
      payload: {}
    };

    const decision = engine.evaluate(context);
    expect(decision.actions).toContainEqual({ type: "sandbox" });
    expect(decision.actions).toContainEqual({ type: "notify", argument: "security-team" });
  });

  it("maintains audit trail", () => {
    engine.evaluate({
      eventType: "any",
      risk: 0.5,
      agentId: "agent-2",
      agentTrust: 0.7,
      action: "test",
      payload: {}
    });

    const log = engine.getAuditLog();
    expect(log.length).toBeGreaterThan(0);
  });
});
