/**
 * apps/agent-runner/src/handlers/troubleshoot.ts  (Agi-Suite monorepo)
 *
 * Troubleshoot agent handler.
 * Scans configured R3v4 subsystems and injects findings via AgentBridge.
 *
 * Config schema (agent.config):
 * {
 *   checkAudioBuffer?:    boolean
 *   checkVocalSpectra?:   boolean
 *   checkMixSuggestions?: boolean
 *   checkDrizzleMigrations?: boolean  // checks R3v4 migration health
 *   autoApplyCritical?:   boolean     // auto-fix critical findings if handler provides one
 * }
 */
import type { AgentBridge }  from '../agent-bridge';
import type { AgentFinding } from '@r3/api-types';

interface TroubleshootConfig {
  checkAudioBuffer?:       boolean;
  checkVocalSpectra?:      boolean;
  checkMixSuggestions?:    boolean;
  checkDrizzleMigrations?: boolean;
  autoApplyCritical?:      boolean;
}

export const TroubleshootHandler = {
  async execute(rawConfig: Record<string, unknown>, bridge: AgentBridge): Promise<void> {
    const config = rawConfig as TroubleshootConfig;
    const findings: AgentFinding[] = [];
    const autoApply = config.autoApplyCritical ?? false;

    // ── 1. Audio buffer underrun check ────────────────────────────────────
    if (config.checkAudioBuffer) {
      try {
        // Probe R3v4 metrics endpoint via AgentBridge's tRPC client
        // (bridge exposes r3 client via protected method for advanced handlers)
        const metrics = await bridge['r3'].diagnostics.getAudioMetrics.query({
          sessionId: bridge.config.sessionId ?? undefined,
        });

        if (metrics.bufferUnderrunRate > 0.05) {
          findings.push({
            severity:  'error',
            category:  'audio-engine',
            message:   `Buffer underrun rate ${(metrics.bufferUnderrunRate * 100).toFixed(1)}% exceeds 5% threshold`,
            fix:       'Increase audio buffer size to 512 samples in AudioContext config',
            autoApply: autoApply && false, // never auto-apply audio config changes
          });
        }

        if (metrics.latencyMs > 20) {
          findings.push({
            severity: 'warn',
            category: 'audio-engine',
            message:  `Audio output latency ${metrics.latencyMs.toFixed(1)}ms — target is <20ms`,
          });
        }
      } catch (err) {
        findings.push({
          severity: 'warn',
          category: 'audio-engine',
          message:  `Could not fetch audio metrics: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    // ── 2. VocalSpectra node health ───────────────────────────────────────
    if (config.checkVocalSpectra) {
      try {
        const nodeHealth = await bridge['r3'].vocalSpectra.getNodeHealth.query({
          sessionId: bridge.config.sessionId ?? undefined,
        });

        for (const node of nodeHealth.nodes) {
          if (node.status === 'error') {
            findings.push({
              severity:  'critical',
              category:  'vocal-spectra',
              message:   `VocalSpectra node ${node.nodeId} is in error state: ${node.errorDetail}`,
              fix:       `Restart node via vocalSpectra.restartNode({ nodeId: '${node.nodeId}' })`,
              autoApply: autoApply,
            });
          } else if (node.cpuUsage > 0.85) {
            findings.push({
              severity: 'warn',
              category: 'vocal-spectra',
              message:  `VocalSpectra node ${node.nodeId} CPU at ${(node.cpuUsage * 100).toFixed(0)}%`,
            });
          }
        }
      } catch (err) {
        findings.push({
          severity: 'warn',
          category: 'vocal-spectra',
          message:  `VocalSpectra health check failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    // ── 3. Mix suggestions acceptance rate check ──────────────────────────
    if (config.checkMixSuggestions) {
      try {
        const stats = await bridge['r3'].sessionMetrics.getAcceptanceStats.query({
          sessionId: bridge.config.sessionId ?? undefined,
        });

        if (stats.acceptanceRate < 0.65) {
          findings.push({
            severity: 'warn',
            category: 'ai-acceptance-rate',
            message:  `AI suggestion acceptance rate ${(stats.acceptanceRate * 100).toFixed(1)}% — below 65% valuation gate`,
            fix:      'Review suggestion confidence thresholds in useMixSuggestions.ts',
          });
        }
      } catch (err) {
        findings.push({
          severity: 'info',
          category: 'ai-acceptance-rate',
          message:  `Could not check acceptance rate: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    // ── 4. Drizzle migration health ───────────────────────────────────────
    if (config.checkDrizzleMigrations) {
      try {
        const migrationStatus = await bridge['r3'].diagnostics.getMigrationStatus.query();

        if (!migrationStatus.upToDate) {
          findings.push({
            severity: 'critical',
            category: 'database',
            message:  `R3v4 DB has ${migrationStatus.pendingCount} unapplied migration(s): ${migrationStatus.pending.join(', ')}`,
            fix:      'Run: pnpm --filter @r3/db db:migrate from ~/Stable root',
            autoApply: false, // never auto-apply DB migrations
          });
        }

        if (migrationStatus.aiDecisionLogMissing) {
          findings.push({
            severity: 'critical',
            category: 'database',
            message:  'aiDecisionLog table missing — P0 demo blocker',
            fix:      'Apply migration 0005: pnpm --filter @r3/db db:migrate',
          });
        }
      } catch (err) {
        findings.push({
          severity: 'warn',
          category: 'database',
          message:  `Migration health check failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    // ── Inject all findings into R3v4 ────────────────────────────────────
    if (findings.length > 0) {
      await bridge.reportTroubleshooting(findings);
    }

    // ── Log the diagnostic pass as an AI decision (acceptance rate gate) ─
    const criticalCount = findings.filter((f) => f.severity === 'critical').length;
    const errorCount    = findings.filter((f) => f.severity === 'error').length;

    await bridge.logDecision({
      decisionType: 'troubleshoot-scan',
      confidence:   findings.length === 0 ? 0.99 : 0.88,
      rationale:    findings.length === 0
        ? 'All subsystems healthy — no issues detected'
        : `Found ${findings.length} issue(s): ${criticalCount} critical, ${errorCount} error`,
      metadata: {
        findingCount:  findings.length,
        criticalCount,
        errorCount,
        checksRun:     Object.entries(config)
                         .filter(([, v]) => v === true)
                         .map(([k]) => k),
      },
    });
  },
};
