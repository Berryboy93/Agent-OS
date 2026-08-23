import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from 'react';

import './styles/command-center.css';

import {
  useHealthCheck,
  useRuns,
} from './hooks/useCommandCenter';

import { useEventStream } from './hooks/useEventStream';

import { ToolsPage } from './pages/Tools';

type ViewName =
  | 'Overview'
  | 'Runs'
  | 'Agents'
  | 'Tools'
  | 'Approvals'
  | 'Deployments'
  | 'Pipelines'
  | 'Analytics'
  | 'Alerts'
  | 'Settings';

interface NormalizedRun {
  id: string;
  agent: string;
  status: string;
  tokens: number;
  duration: string;
  createdAt: string;
  raw: unknown;
}

interface NavItem {
  label: ViewName;
  icon: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: 'Overview', icon: '⊞' },
  { label: 'Runs', icon: '▶' },
  { label: 'Agents', icon: '◈' },
  { label: 'Tools', icon: '⚙' },
  { label: 'Approvals', icon: '✓' },
  { label: 'Deployments', icon: '◆' },
  { label: 'Pipelines', icon: '≡' },
  { label: 'Analytics', icon: '◌' },
  { label: 'Alerts', icon: '!' },
  { label: 'Settings', icon: '⚙' },
];

const commands: Array<{
  label: string;
  action: ViewName;
  key: string;
}> = [
  { label: '→ Find runs', action: 'Runs', key: 'Enter' },
  { label: '◈ Open agents', action: 'Agents', key: '⌘ 1' },
  { label: '✓ Pending approvals', action: 'Approvals', key: '⌘ 2' },
  { label: '◆ View deployments', action: 'Deployments', key: '⌘ 3' },
  { label: '◌ System analytics', action: 'Analytics', key: '⌘ 4' },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getString(
  object: Record<string, unknown>,
  keys: string[],
  fallback: string,
): string {
  for (const key of keys) {
    const value = object[key];

    if (
      typeof value === 'string' ||
      typeof value === 'number'
    ) {
      return String(value);
    }
  }

  return fallback;
}

function getNumber(
  object: Record<string, unknown>,
  keys: string[],
  fallback = 0,
): number {
  for (const key of keys) {
    const value = object[key];

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (
      typeof value === 'string' &&
      value.trim() !== '' &&
      Number.isFinite(Number(value))
    ) {
      return Number(value);
    }
  }

  return fallback;
}

function normalizeRuns(source: unknown): NormalizedRun[] {
  let candidate: unknown = source;

  if (isRecord(candidate)) {
    if (Array.isArray(candidate.runs)) {
      candidate = candidate.runs;
    } else if (Array.isArray(candidate.items)) {
      candidate = candidate.items;
    } else if (isRecord(candidate.data)) {
      const data = candidate.data;

      if (Array.isArray(data.runs)) {
        candidate = data.runs;
      } else if (Array.isArray(data.items)) {
        candidate = data.items;
      }
    } else if (Array.isArray(candidate.data)) {
      candidate = candidate.data;
    }
  }

  if (!Array.isArray(candidate)) {
    return [];
  }

  return candidate
    .filter(isRecord)
    .map((run, index) => ({
      id: getString(
        run,
        ['id', 'runId', 'run_id', 'uuid'],
        `run-${index + 1}`,
      ),

      agent: getString(
        run,
        ['agent', 'agentName', 'agent_id', 'agentId'],
        'unknown-agent',
      ),

      status: getString(
        run,
        ['status', 'state'],
        'UNKNOWN',
      ).toUpperCase(),

      tokens: getNumber(
        run,
        ['tokens', 'tokenCount', 'totalTokens', 'total_tokens'],
      ),

      duration: getString(
        run,
        ['duration', 'durationText'],
        '—',
      ),

      createdAt: getString(
        run,
        ['createdAt', 'created_at', 'created', 'timestamp', 'time'],
        '—',
      ),

      raw: run,
    }));
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function statusClass(status: string): string {
  const normalized = status.toLowerCase();

  if (
    normalized.includes('complete') ||
    normalized === 'success' ||
    normalized === 'succeeded'
  ) {
    return 'completed';
  }

  if (
    normalized.includes('run') ||
    normalized.includes('progress') ||
    normalized === 'pending'
  ) {
    return 'running';
  }

  if (
    normalized.includes('fail') ||
    normalized.includes('error')
  ) {
    return 'failed';
  }

  return 'unknown';
}

export default function App() {
  const [currentView, setCurrentView] =
    useState<ViewName>('Overview');

  const [selectedRunId, setSelectedRunId] =
    useState<string | null>(null);

  const [commandOpen, setCommandOpen] =
    useState(false);

  const [commandInput, setCommandInput] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState('All Status');

  const [agentFilter, setAgentFilter] =
    useState('All Agents');

  const [selectedTab, setSelectedTab] =
    useState('Timeline');

  const [toast, setToast] = useState<{
    title: string;
    text: string;
  } | null>(null);

  const [time, setTime] = useState(
    new Date().toLocaleTimeString(
      [],
      {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      },
    ),
  );

  const {
    data: healthData,
  } = useHealthCheck();

  const {
    data: runsData,
  } = useRuns();

  const {
    isConnected,
  } = useEventStream();

  const runs = useMemo(
    () => normalizeRuns(runsData),
    [runsData],
  );

  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      const statusMatch =
        statusFilter === 'All Status' ||
        run.status === statusFilter;

      const agentMatch =
        agentFilter === 'All Agents' ||
        run.agent === agentFilter;

      return statusMatch && agentMatch;
    });
  }, [
    runs,
    statusFilter,
    agentFilter,
  ]);

  const selectedRun = useMemo(() => {
    if (selectedRunId) {
      return (
        runs.find(
          (run) => run.id === selectedRunId,
        ) ?? null
      );
    }

    return runs[0] ?? null;
  }, [
    runs,
    selectedRunId,
  ]);

  const isHealthy =
    isRecord(healthData) &&
    (
      healthData.status === 'ok' ||
      healthData.status === 'healthy'
    );

  const totalTokens = useMemo(
    () =>
      runs.reduce(
        (total, run) => total + run.tokens,
        0,
      ),
    [runs],
  );

  const activeAgents = useMemo(() => {
    return new Set(
      runs
        .filter(
          (run) =>
            statusClass(run.status) === 'running',
        )
        .map((run) => run.agent),
    ).size;
  }, [runs]);

  const successRate = useMemo(() => {
    if (!runs.length) {
      return null;
    }

    const successful = runs.filter(
      (run) =>
        statusClass(run.status) === 'completed',
    ).length;

    return (
      (successful / runs.length) *
      100
    ).toFixed(1);
  }, [runs]);

  const notify = (
    title: string,
    text: string,
  ) => {
    setToast({
      title,
      text,
    });
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTime(
        new Date().toLocaleTimeString(
          [],
          {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          },
        ),
      );
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 2600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  useEffect(() => {
    const handleKeyDown = (
      event: globalThis.KeyboardEvent,
    ) => {
      const modifier =
        event.metaKey || event.ctrlKey;

      if (
        modifier &&
        event.key.toLowerCase() === 'k'
      ) {
        event.preventDefault();
        setCommandOpen(true);
        return;
      }

      if (event.key === 'Escape') {
        setCommandOpen(false);
      }

      if (
        modifier &&
        event.key === '1'
      ) {
        event.preventDefault();
        setCurrentView('Agents');
      }

      if (
        modifier &&
        event.key === '2'
      ) {
        event.preventDefault();
        setCurrentView('Approvals');
      }

      if (
        modifier &&
        event.key === '3'
      ) {
        event.preventDefault();
        setCurrentView('Deployments');
      }

      if (
        modifier &&
        event.key === '4'
      ) {
        event.preventDefault();
        setCurrentView('Analytics');
      }
    };

    window.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown,
      );
    };
  }, []);

  const handleNavKey = (
    event: KeyboardEvent<HTMLButtonElement>,
    view: ViewName,
  ) => {
    if (
      event.key === 'Enter' ||
      event.key === ' '
    ) {
      event.preventDefault();
      setCurrentView(view);
    }
  };

  const filteredCommands =
    commands.filter((command) =>
      command.label
        .toLowerCase()
        .includes(
          commandInput.toLowerCase(),
        ),
    );

  const showOverview =
    currentView === 'Overview';

  return (
    <div className="app">
      <div className="scanline s1" />
      <div className="scanline s2" />

      <div className="app-container">
        <aside className="sidebar">
          <div className="brand">
            <div className="logo">
              <svg
                viewBox="0 0 32 32"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M16 3 27 9.3v13.4L16 29 5 22.7V9.3L16 3Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="m10 11 6-3.4 6 3.4v7l-6 3.4-6-3.4v-7Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M16 14v7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </div>

            <div>
              <div className="brand-name">
                Agent-OS
              </div>

              <div className="enterprise">
                Command Center
              </div>
            </div>
          </div>

          <nav
            className="nav"
            aria-label="Main navigation"
          >
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`nav-item ${
                  currentView === item.label
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  setCurrentView(item.label)
                }
                onKeyDown={(event) =>
                  handleNavKey(
                    event,
                    item.label,
                  )
                }
              >
                <span
                  aria-hidden="true"
                  className="nav-icon"
                >
                  {item.icon}
                </span>

                <span>
                  {item.label}
                </span>

                {item.badge && (
                  <span className="badge">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="status-card">
            <div className="status-title">
              System Status
            </div>

            <div
              className={
                isHealthy
                  ? 'healthy'
                  : 'healthy warning'
              }
            >
              <span className="dot pulse" />

              {isHealthy
                ? 'Healthy'
                : 'Checking'}
            </div>

            <div className="status-sub">
              {isHealthy
                ? 'Health endpoint reports operational'
                : 'Waiting for health endpoint'}
            </div>

            <div className="status-divider" />

            <div className="status-stream">
              <span
                className={
                  isConnected
                    ? 'stream-dot connected'
                    : 'stream-dot disconnected'
                }
              />

              Event stream:
              {' '}
              {isConnected
                ? 'Connected'
                : 'Disconnected'}
            </div>
          </div>

          <div className="account">
            <div className="avatar">
              AO
            </div>

            <div>
              <div className="account-name">
                Agent-OS
              </div>

              <div className="account-mail">
                Command Center
              </div>
            </div>
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <div className="title">
              <h1>
                {showOverview
                  ? 'Command Center'
                  : currentView}
              </h1>

              <p>
                {showOverview
                  ? 'Living control plane for autonomous agents and workflows'
                  : `Agent-OS ${currentView.toLowerCase()} workspace`}
              </p>
            </div>

            <div className="top-actions">
              <button
                type="button"
                className="search"
                onClick={() =>
                  setCommandOpen(true)
                }
                aria-label="Open command palette"
              >
                <span aria-hidden="true">
                  ⌕
                </span>

                <span className="search-placeholder">
                  Search anything...
                </span>

                <span className="key">
                  ⌘ K
                </span>
              </button>

              <div className="live">
                <div className="live-row">
                  <span
                    className={
                      isConnected
                        ? 'green-dot'
                        : 'red-dot'
                    }
                  />

                  <span>
                    {isConnected
                      ? 'Live'
                      : 'Offline'}
                  </span>
                </div>

                <div className="live-sub">
                  {isConnected
                    ? `Connected · ${time}`
                    : `Disconnected · ${time}`}
                </div>
              </div>

              <button
                type="button"
                className="circle-btn"
                onClick={() =>
                  setCurrentView(
                    'Approvals',
                  )
                }
                aria-label="Open approvals"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 10h18c0-3-3-3-3-10ZM10 21h4"
                    stroke="currentColor"
                    fill="none"
                    strokeWidth="1.5"
                  />
                </svg>

                <span className="notify-badge">
                  3
                </span>
              </button>
            </div>
          </header>

          {currentView === 'Tools' ? (
            <section className="workspace-panel tools-host">
              <ToolsPage />
            </section>
          ) : showOverview ? (
            <>
              <section className="metrics">
                <div className="metric purple">
                  <div className="metric-head">
                    <div className="metric-icon">
                      ◈
                    </div>

                    <div>
                      <div className="metric-label">
                        Total Runs
                      </div>

                      <div className="metric-value">
                        {formatNumber(
                          runs.length,
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="metric-change">
                    Live data
                  </div>
                </div>

                <div className="metric green">
                  <div className="metric-head">
                    <div className="metric-icon">
                      ✓
                    </div>

                    <div>
                      <div className="metric-label">
                        Success Rate
                      </div>

                      <div className="metric-value">
                        {successRate
                          ? `${successRate}%`
                          : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="metric-change">
                    Based on loaded runs
                  </div>
                </div>

                <div className="metric blue">
                  <div className="metric-head">
                    <div className="metric-icon">
                      ≋
                    </div>

                    <div>
                      <div className="metric-label">
                        Total Tokens
                      </div>

                      <div className="metric-value">
                        {totalTokens
                          ? totalTokens >= 1000000
                            ? `${(
                                totalTokens /
                                1000000
                              ).toFixed(2)}M`
                            : formatNumber(
                                totalTokens,
                              )
                          : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="metric-change">
                    Loaded from run data
                  </div>
                </div>

                <div className="metric amber">
                  <div className="metric-head">
                    <div className="metric-icon">
                      ◈
                    </div>

                    <div>
                      <div className="metric-label">
                        Active Agents
                      </div>

                      <div className="metric-value">
                        {runs.length
                          ? activeAgents
                          : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="metric-change">
                    Based on running runs
                  </div>
                </div>
              </section>

              <section className="content">
                <div className="panel runs">
                  <div className="panel-head">
                    <div className="panel-title">
                      Recent Runs
                    </div>

                    <div className="filters">
                      <button
                        type="button"
                        className="select"
                        onClick={() => {
                          const statuses = [
                            'All Status',
                            ...Array.from(
                              new Set(
                                runs.map(
                                  (run) =>
                                    run.status,
                                ),
                              ),
                            ),
                          ];

                          const index =
                            statuses.indexOf(
                              statusFilter,
                            );

                          setStatusFilter(
                            statuses[
                              (index + 1) %
                                statuses.length
                            ] ??
                              'All Status',
                          );
                        }}
                      >
                        {statusFilter}
                        {' '}⌄
                      </button>

                      <button
                        type="button"
                        className="select"
                        onClick={() => {
                          const agents = [
                            'All Agents',
                            ...Array.from(
                              new Set(
                                runs.map(
                                  (run) =>
                                    run.agent,
                                ),
                              ),
                            ),
                          ];

                          const index =
                            agents.indexOf(
                              agentFilter,
                            );

                          setAgentFilter(
                            agents[
                              (index + 1) %
                                agents.length
                            ] ??
                              'All Agents',
                          );
                        }}
                      >
                        {agentFilter}
                        {' '}⌄
                      </button>

                      <button
                        type="button"
                        className="view-btn"
                        onClick={() =>
                          setCurrentView(
                            'Runs',
                          )
                        }
                      >
                        View All Runs ↗
                      </button>
                    </div>
                  </div>

                  <div className="table-head">
                    <span>RUN ID</span>
                    <span>AGENT</span>
                    <span>STATUS</span>
                    <span>TOKENS</span>
                    <span>DURATION</span>
                    <span>CREATED AT</span>
                    <span />
                  </div>

                  <div className="run-list">
                    {filteredRuns.length ===
                    0 ? (
                      <div className="empty-state">
                        <strong>
                          No run data available
                        </strong>

                        <span>
                          The dashboard is using the
                          existing Agent-OS run hook.
                          No fabricated runs are
                          displayed.
                        </span>
                      </div>
                    ) : (
                      filteredRuns.map(
                        (run) => (
                          <button
                            type="button"
                            key={run.id}
                            className="row"
                            onClick={() => {
                              setSelectedRunId(
                                run.id,
                              );

                              notify(
                                'Run selected',
                                `${run.id} opened in Run Inspector.`,
                              );
                            }}
                          >
                            <span className="runid">
                              {run.id}
                            </span>

                            <span>
                              {run.agent}
                            </span>

                            <span>
                              <b
                                className={`status ${statusClass(
                                  run.status,
                                )}`}
                              >
                                {run.status}
                              </b>
                            </span>

                            <span>
                              {run.tokens
                                ? formatNumber(
                                    run.tokens,
                                  )
                                : '—'}
                            </span>

                            <span>
                              {run.duration}
                            </span>

                            <span>
                              {run.createdAt}
                            </span>

                            <span>
                              ›
                            </span>
                          </button>
                        ),
                      )
                    )}
                  </div>

                  <div className="pagination">
                    <span>
                      Showing{' '}
                      {filteredRuns.length}{' '}
                      of{' '}
                      {runs.length}{' '}
                      loaded runs
                    </span>
                  </div>
                </div>

                <div className="panel events">
                  <div className="event-head">
                    <div className="panel-title">
                      Event Stream
                    </div>

                    <div className="event-live">
                      <span
                        className={
                          isConnected
                            ? 'green-dot'
                            : 'red-dot'
                        }
                      />

                      {isConnected
                        ? 'Live'
                        : 'Disconnected'}
                    </div>
                  </div>

                  <div className="event-list">
                    <div className="event">
                      <div className="event-icon">
                        {isConnected
                          ? '✓'
                          : '!'}
                      </div>

                      <div className="event-text">
                        <div className="event-name">
                          Event stream status
                        </div>

                        <div className="event-desc">
                          {isConnected
                            ? 'The existing Agent-OS event stream reports an active connection.'
                            : 'The existing Agent-OS event stream is not currently connected.'}
                        </div>
                      </div>

                      <div className="event-time">
                        {time}
                      </div>
                    </div>

                    <div className="event">
                      <div className="event-icon">
                        ◈
                      </div>

                      <div className="event-text">
                        <div className="event-name">
                          Data source
                        </div>

                        <div className="event-desc">
                          Events are intentionally not fabricated by the Command Center UI.
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="full-log"
                    onClick={() =>
                      setCurrentView(
                        'Alerts',
                      )
                    }
                  >
                    <span>
                      Open event workspace
                    </span>

                    <span>↗</span>
                  </button>
                </div>
              </section>

              <section className="panel details">
                <div className="panel-head">
                  <div className="panel-title">
                    Run Inspector
                  </div>

                  {selectedRun && (
                    <div
                      className={`run-state ${statusClass(
                        selectedRun.status,
                      )}`}
                    >
                      {selectedRun.status}
                    </div>
                  )}

                  <button
                    type="button"
                    className="details-btn"
                    disabled={!selectedRun}
                    onClick={() =>
                      notify(
                        'Run Inspector',
                        selectedRun
                          ? `Selected run: ${selectedRun.id}`
                          : 'Select a run first.',
                      )
                    }
                  >
                    View Full Details ↗
                  </button>
                </div>

                <div className="details-body">
                  {!selectedRun ? (
                    <div className="inspector-empty">
                      <strong>
                        No run selected
                      </strong>

                      <span>
                        Select a run above to inspect
                        its available metadata.
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="run-meta">
                        <div className="run-fullid">
                          {selectedRun.id}
                        </div>

                        <div className="meta-grid">
                          <div>
                            <div className="meta-label">
                              Agent
                            </div>

                            <div className="meta-value purple-text">
                              ●{' '}
                              {
                                selectedRun.agent
                              }
                            </div>
                          </div>

                          <div>
                            <div className="meta-label">
                              Created
                            </div>

                            <div className="meta-value">
                              {
                                selectedRun.createdAt
                              }
                            </div>
                          </div>

                          <div>
                            <div className="meta-label">
                              Duration
                            </div>

                            <div className="meta-value">
                              {
                                selectedRun.duration
                              }
                            </div>
                          </div>

                          <div>
                            <div className="meta-label">
                              Tokens
                            </div>

                            <div className="meta-value">
                              {selectedRun.tokens
                                ? formatNumber(
                                    selectedRun.tokens,
                                  )
                                : '—'}
                            </div>
                          </div>

                          <div>
                            <div className="meta-label">
                              Status
                            </div>

                            <div className="meta-value">
                              {
                                selectedRun.status
                              }
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="timeline">
                        <div className="tabs">
                          {[
                            'Timeline',
                            'Turns',
                            'Tools',
                            'Logs',
                            'Metadata',
                          ].map((tab) => (
                            <button
                              type="button"
                              key={tab}
                              className={`tab ${
                                selectedTab ===
                                tab
                                  ? 'active'
                                  : ''
                              }`}
                              onClick={() =>
                                setSelectedTab(
                                  tab,
                                )
                              }
                            >
                              {tab}
                            </button>
                          ))}
                        </div>

                        <div className="timeline-content">
                          <div className="timeline-line" />

                          <div className="timeline-node">
                            {selectedTab}
                          </div>

                          <div className="timeline-note">
                            Detailed trace data will
                            be displayed here when
                            provided by the existing
                            Agent-OS run API.
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </section>
            </>
          ) : (
            <section className="workspace-panel">
              <div className="workspace-icon">
                ◈
              </div>

              <h2>
                {currentView}
              </h2>

              <p>
                This workspace is preserved as a
                navigation surface without
                fabricating operational data.
              </p>

              <div className="workspace-status">
                Agent-OS backend integration remains
                available through the existing
                application architecture.
              </div>
            </section>
          )}
        </main>
      </div>

      {commandOpen && (
        <div
          className="command open"
          role="presentation"
          onMouseDown={() =>
            setCommandOpen(false)
          }
        >
          <div
            className="command-box"
            role="dialog"
            aria-modal="true"
            aria-label="Agent-OS command palette"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="command-search">
              <span aria-hidden="true">
                ⌕
              </span>

              <input
                autoFocus
                placeholder="Search Agent-OS commands..."
                value={commandInput}
                onChange={(event) =>
                  setCommandInput(
                    event.target.value,
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    'Escape'
                  ) {
                    setCommandOpen(false);
                  }

                  if (
                    event.key ===
                      'Enter' &&
                    filteredCommands[0]
                  ) {
                    setCurrentView(
                      filteredCommands[0]
                        .action,
                    );

                    setCommandOpen(
                      false,
                    );

                    setCommandInput('');
                  }
                }}
              />
            </div>

            <div className="commands">
              {filteredCommands.length ===
              0 ? (
                <div className="command-empty">
                  No commands found.
                </div>
              ) : (
                filteredCommands.map(
                  (command) => (
                    <button
                      type="button"
                      key={command.action}
                      className="command-item"
                      onClick={() => {
                        setCurrentView(
                          command.action,
                        );

                        setCommandOpen(
                          false,
                        );

                        setCommandInput('');
                      }}
                    >
                      <span>
                        {command.label}
                      </span>

                      <span className="command-k">
                        {command.key}
                      </span>
                    </button>
                  ),
                )
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="toast show"
          role="status"
          aria-live="polite"
        >
          <strong>
            {toast.title}
          </strong>

          <p>
            {toast.text}
          </p>
        </div>
      )}
    </div>
  );
}
