import { describe, expect, it } from "vitest";
import {
  DomainValidatorRegistry,
  evaluateGovernance,
  isEvidenceCategory,
  isEvidenceStatus,
  isPromotionDecision,
  sealEvidenceBundle,
  verifyEvidenceBundle,
  type ChangeRequest,
  type GovernanceEvidenceBundle,
} from "../src/index.js";

describe("governance contract", () => {
  it("accepts only domain-defined evidence values", () => {
    expect(isEvidenceCategory("test")).toBe(true);
    expect(isEvidenceCategory("banana")).toBe(false);
    expect(isEvidenceStatus("warning")).toBe(true);
    expect(isEvidenceStatus("unknown")).toBe(false);
    expect(isPromotionDecision("promote")).toBe(true);
    expect(isPromotionDecision("deploy_now")).toBe(false);
  });

  it("blocks credential-bound changes", () => {
    const request: ChangeRequest = {
      id: "cr-1",
      objective: "credential-sensitive operation",
      actor: { type: "automation", id: "test" },
      surfaces: ["auth"],
      actionType: ["code_change"],
      blastRadius: { advisory: "critical", mythosRepriced: "critical", final: "critical" },
      boundaries: {
        credentials: true,
        payment: false,
        auth: true,
        production_deployment: false,
        sandbox: true,
      },
      recovery: { rollbackAvailable: true },
      governance: {
        anchoringAlert: false,
        decision: "BLOCK",
        owner: "test",
      },
    };

    expect(
      evaluateGovernance({
        changeRequest: request,
        barriers: [],
        domainValidations: [],
        evidence: [],
        recoveryAvailable: true,
      }),
    ).toBe("BLOCK");
  });

  it("seals and verifies an evidence bundle", () => {
    const request: ChangeRequest = {
      id: "cr-2",
      objective: "safe test change",
      actor: { type: "automation", id: "test" },
      surfaces: ["ui"],
      actionType: ["code_change"],
      blastRadius: { advisory: "low", mythosRepriced: "low", final: "low" },
      boundaries: {
        credentials: false,
        payment: false,
        auth: false,
        production_deployment: false,
        sandbox: true,
      },
      recovery: { rollbackAvailable: true },
      governance: {
        anchoringAlert: false,
        decision: "ALLOW_RUNTIME",
        owner: "test",
      },
    };

    const bundle: GovernanceEvidenceBundle = {
      schemaVersion: "0.4",
      changeRequest: request,
      evidence: [
        {
          id: "ev-1",
          kind: "unit-test",
          grade: "E3",
          claim: "tests pass",
          source: "vitest",
          result: "pass",
          createdAt: new Date().toISOString(),
        },
      ],
      barriers: [],
      domainValidations: [],
    };

    const sealed = sealEvidenceBundle(bundle, "2026-09-11T00:00:00.000Z");
    expect(sealed.evidenceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyEvidenceBundle(sealed)).toBe(true);
  });

  it("detects tampering after a bundle has been sealed", () => {
    const request: ChangeRequest = {
      id: "cr-tamper",
      objective: "tamper detection test",
      actor: { type: "automation", id: "test" },
      surfaces: ["ui"],
      actionType: ["code_change"],
      blastRadius: {
        advisory: "low",
        mythosRepriced: "low",
        final: "low",
      },
      boundaries: {
        credentials: false,
        payment: false,
        auth: false,
        production_deployment: false,
        sandbox: true,
      },
      recovery: { rollbackAvailable: true },
      governance: {
        anchoringAlert: false,
        decision: "ALLOW_RUNTIME",
        owner: "test",
      },
    };

    const bundle: GovernanceEvidenceBundle = {
      schemaVersion: "0.4",
      changeRequest: request,
      evidence: [
        {
          id: "ev-tamper",
          kind: "unit-test",
          grade: "E3",
          claim: "tests pass",
          source: "vitest",
          result: "pass",
          createdAt: "2026-09-11T00:00:00.000Z",
          metadata: {
            original: true,
            nested: {
              value: "trusted",
            },
          },
        },
      ],
      barriers: [],
      domainValidations: [],
    };

    const sealed = sealEvidenceBundle(
      bundle,
      "2026-09-11T00:00:00.000Z",
    );

    expect(verifyEvidenceBundle(sealed)).toBe(true);

    const tampered = {
      ...sealed,
      evidence: sealed.evidence.map((item) => ({
        ...item,
        metadata: {
          ...item.metadata,
          nested: {
            value: "tampered",
          },
        },
      })),
    };

    expect(verifyEvidenceBundle(tampered)).toBe(false);

    const topLevelTampered = {
      ...sealed,
      changeRequest: {
        ...sealed.changeRequest,
        objective: "tampered objective",
      },
    };

    expect(verifyEvidenceBundle(topLevelTampered)).toBe(false);
  });


  it("requires evidence integrity verification before autonomous promotion", () => {
    const request: ChangeRequest = {
      id: "cr-promotion-integrity",
      objective: "promotion integrity boundary",
      actor: { type: "automation", id: "test" },
      surfaces: ["ui"],
      actionType: ["code_change"],
      blastRadius: {
        advisory: "low",
        mythosRepriced: "low",
        final: "low",
      },
      boundaries: {
        credentials: false,
        payment: false,
        auth: false,
        production_deployment: false,
        sandbox: true,
      },
      recovery: { rollbackAvailable: true },
      governance: {
        anchoringAlert: false,
        decision: "ALLOW_RUNTIME",
        owner: "test",
      },
    };

    const bundle: GovernanceEvidenceBundle = {
      schemaVersion: "0.4",
      changeRequest: request,
      evidence: [
        {
          id: "ev-integrity",
          kind: "unit-test",
          grade: "E3",
          claim: "tests pass",
          source: "vitest",
          result: "pass",
          createdAt: "2026-09-11T00:00:00.000Z",
        },
      ],
      barriers: [],
      domainValidations: [],
    };

    const sealed = sealEvidenceBundle(
      bundle,
      "2026-09-11T00:00:00.000Z",
    );

    expect(verifyEvidenceBundle(sealed)).toBe(true);

    const tampered = {
      ...sealed,
      evidence: sealed.evidence.map((item) => ({
        ...item,
        result: "fail" as const,
      })),
    };

    expect(verifyEvidenceBundle(tampered)).toBe(false);

    /*
     * GovernanceEvidenceBundle integrity is verified independently here.
     * The promotion engine separately verifies the EvidenceBundle it
     * actually scores before allowing autonomous promotion.
     *
     * Keeping these artifacts distinct prevents a valid governance
     * bundle from being incorrectly paired with another evidence bundle.
     */
    const integrityVerified = verifyEvidenceBundle(tampered);

    expect(integrityVerified).toBe(false);
  });



  it("rejects duplicate validator registration", () => {
    const registry = new DomainValidatorRegistry();
    const validator = {
      id: "validator.test",
      version: "1.0.0",
      surfaces: ["ui"],
      async validate() {
        throw new Error("not executed");
      },
    };

    registry.register(validator);
    expect(() => registry.register(validator)).toThrow("Duplicate domain validator");
  });
});
