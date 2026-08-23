# Security Model

## Threat Model

| Threat | Mitigation |
|--------|-----------|
| Agent escapes sandbox | vm2 isolation, no network/fs access by default |
| Privilege escalation | CapabilityManager with fine-grained constraints |
| DAG bypass | Immutable validation, no runtime DAG modification |
| Event tampering | SHA-256 chain, Postgres triggers prevent UPDATE/DELETE |
| Policy bypass | Mythos evaluated before every execution stage |
| Network attack | K8s NetworkPolicies, Istio mTLS, zero-trust |
| Resource exhaustion | HPA/VPA autoscaling, resource quotas, circuit breakers |

## Policy DSL Examples

```
policy {
  rule "block_high_risk" {
    when: pre_execution
    if: risk > 0.7
    then: reject
  }

  rule "quarantine_untrusted" {
    when: agent_spawn
    if: agent.trust < 0.3
    then: quarantine
  }

  rule "audit_all" {
    when: any
    then: log_event
  }

  rule "rate_limit_agents" {
    when: pre_execution
    if: agent.request_rate > 100
    then: rate_limit(10)
  }

  rule "require_approval_for_mutation" {
    when: memory_access
    if: action == "write" and payload.critical == true
    then: require_approval("senior_operator")
  }
}
```

## Compliance

- All events are immutable and auditable
- Full replay capability for incident investigation
- Policy decisions are logged with full context
- Agent actions are sandboxed and resource-bounded
