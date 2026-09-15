import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Circle,
  Cpu,
  Database,
  GitBranch,
  LockKeyhole,
  Play,
  ShieldCheck,
  SquareTerminal,
  Waypoints,
  XCircle,
} from 'lucide-react';

import '../styles/native-shift.css';

type StageStatus = 'complete' | 'active' | 'pending' | 'blocked';

interface Stage {
  id: string;
  label: string;
  detail: string;
  status: StageStatus;
  icon: typeof Activity;
}

const initialStages: Stage[] = [
  {
    id: 'mission',
    label: 'MISSION',
    detail: 'Engineering objective received',
    status: 'complete',
    icon: SquareTerminal,
  },
  {
    id: 'plan',
    label: 'PLAN',
    detail: 'Execution strategy prepared',
    status: 'complete',
    icon: GitBranch,
  },
  {
    id: 'mythos',
    label: 'MYTHOS',
    detail: 'Policy gate evaluated',
    status: 'complete',
    icon: ShieldCheck,
  },
  {
    id: 'swarm',
    label: 'SWARM',
    detail: 'DAG execution coordinated',
    status: 'active',
    icon: Waypoints,
  },
  {
    id: 'verify',
    label: 'VERIFY',
    detail: 'Trusted verification pending',
    status: 'pending',
    icon: LockKeyhole,
  },
  {
    id: 'evidence',
    label: 'EVIDENCE',
    detail: 'Evidence sealing pending',
    status: 'pending',
    icon: Database,
  },
  {
    id: 'governance',
    label: 'GOVERNANCE',
    detail: 'Promotion decision pending',
    status: 'pending',
    icon: Cpu,
  },
];

const statusLabel: Record<StageStatus, string> = {
  complete: 'COMPLETE',
  active: 'ACTIVE',
  pending: 'PENDING',
  blocked: 'BLOCKED',
};

export default function NativeShift() {
  const [running, setRunning] = useState(false);
  const [demoStep, setDemoStep] = useState(3);

  const stages = useMemo(
    () =>
      initialStages.map((stage, index) => {
        if (!running) return stage;

        if (index < demoStep) {
          return { ...stage, status: 'complete' as const };
        }

        if (index === demoStep) {
          return { ...stage, status: 'active' as const };
        }

        return { ...stage, status: 'pending' as const };
      }),
    [demoStep, running],
  );

  const activeStage = stages.find((stage) => stage.status === 'active');

  const startDemo = () => {
    setRunning(true);
    setDemoStep(3);
  };

  const advanceDemo = () => {
    setRunning(true);
    setDemoStep((current) => Math.min(current + 1, stages.length - 1));
  };

  const resetDemo = () => {
    setRunning(false);
    setDemoStep(3);
  };

  const completedCount = stages.filter(
    (stage) => stage.status === 'complete',
  ).length;

  const decision =
    running && demoStep >= stages.length - 1
      ? 'READY FOR GOVERNANCE'
      : running
        ? 'EXECUTION IN PROGRESS'
        : 'SHOW-AND-TELL READY';

  return (
    <section className="native-shift">
      <div className="native-shift-hero">
        <div>
          <div className="native-shift-eyebrow">
            NATIVE//SHIFT v0.1 · SHOW-AND-TELL
          </div>

          <h2>NATIVE//SHIFT</h2>

          <p className="native-shift-subtitle">
            Autonomous engineering control plane for Mission → Execution →
            Verification → Evidence → Governance.
          </p>
        </div>

        <div className="native-shift-status">
          <span className="native-shift-status-dot" />
          DASHBOARD ONLINE
        </div>
      </div>

      <div className="native-shift-disclaimer">
        <strong>DEMO SURFACE</strong>
        <span>
          This screen demonstrates the control-plane experience. It does not
          claim that the visual state machine itself executed the underlying
          Agent-OS runtime.
        </span>
      </div>

      <div className="native-shift-grid">
        <article className="native-shift-panel native-shift-mission">
          <div className="native-shift-panel-head">
            <div>
              <div className="native-shift-panel-kicker">MISSION</div>
              <h3>Repository governance hardening</h3>
            </div>

            <span className="native-shift-chip">DEMO OBJECTIVE</span>
          </div>

          <p>
            Demonstrate the visible lifecycle from an engineering objective
            through orchestration, verification, evidence, and governance.
          </p>

          <div className="native-shift-command">
            <span className="native-shift-command-prompt">$</span>
            <span>
              validate governance pipeline and publish trustworthy result
            </span>
          </div>

          <div className="native-shift-actions">
            <button
              type="button"
              className="native-shift-primary"
              onClick={running ? advanceDemo : startDemo}
            >
              <Play size={15} />
              {running ? 'ADVANCE STAGE' : 'START SHOW-AND-TELL'}
            </button>

            <button
              type="button"
              className="native-shift-secondary"
              onClick={resetDemo}
            >
              RESET
            </button>
          </div>
        </article>

        <article className="native-shift-panel native-shift-readout">
          <div className="native-shift-panel-kicker">CONTROL READOUT</div>

          <div className="native-shift-readout-grid">
            <div>
              <span>STAGES</span>
              <strong>{completedCount}/{stages.length}</strong>
            </div>

            <div>
              <span>ACTIVE</span>
              <strong>{activeStage?.label ?? '—'}</strong>
            </div>

            <div>
              <span>STATE</span>
              <strong>{decision}</strong>
            </div>

            <div>
              <span>FOUNDATION</span>
              <strong>1cef400d</strong>
            </div>
          </div>
        </article>
      </div>

      <article className="native-shift-panel native-shift-pipeline">
        <div className="native-shift-panel-head">
          <div>
            <div className="native-shift-panel-kicker">EXECUTION SPINE</div>
            <h3>Mission lifecycle</h3>
          </div>

          <div className="native-shift-live">
            <Activity size={14} />
            LIVE CONTROL SURFACE
          </div>
        </div>

        <div className="native-shift-stage-list">
          {stages.map((stage, index) => {
            const Icon = stage.icon;

            return (
              <div className="native-shift-stage-wrap" key={stage.id}>
                <div
                  className={`native-shift-stage native-shift-stage-${stage.status}`}
                >
                  <div className="native-shift-stage-icon">
                    {stage.status === 'complete' ? (
                      <CheckCircle2 size={18} />
                    ) : stage.status === 'blocked' ? (
                      <XCircle size={18} />
                    ) : stage.status === 'active' ? (
                      <Icon size={18} className="native-shift-pulse" />
                    ) : (
                      <Circle size={18} />
                    )}
                  </div>

                  <div className="native-shift-stage-copy">
                    <div className="native-shift-stage-top">
                      <strong>{stage.label}</strong>
                      <span>{statusLabel[stage.status]}</span>
                    </div>

                    <p>{stage.detail}</p>
                  </div>
                </div>

                {index < stages.length - 1 && (
                  <div
                    className={`native-shift-connector ${
                      index < demoStep && running ? 'complete' : ''
                    }`}
                  >
                    <ArrowRight size={16} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </article>

      <div className="native-shift-footer-grid">
        <article className="native-shift-panel">
          <div className="native-shift-panel-kicker">EVIDENCE MODEL</div>

          <div className="native-shift-evidence-row">
            <div>
              <span>VERIFICATION</span>
              <strong>{running ? 'TRUSTED PROFILE PATH' : 'READY'}</strong>
            </div>

            <div>
              <span>PROVENANCE</span>
              <strong>CONTROLLED</strong>
            </div>

            <div>
              <span>HASH / SEAL</span>
              <strong>{demoStep >= 5 ? 'PENDING SEAL' : 'WAITING'}</strong>
            </div>
          </div>
        </article>

        <article className="native-shift-panel native-shift-decision">
          <div className="native-shift-panel-kicker">GOVERNANCE</div>

          <div className="native-shift-decision-box">
            <span>DECISION STATE</span>
            <strong>
              {demoStep >= stages.length - 1
                ? 'PROMOTION REVIEW READY'
                : 'AWAITING EVIDENCE'}
            </strong>
          </div>
        </article>
      </div>
    </section>
  );
}
