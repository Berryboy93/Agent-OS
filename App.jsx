import React, { useEffect, useState, useCallback, useRef } from 'react';
const API = '/api';

function useInterval(fn, ms) {
    const cb = useRef(fn);
    useEffect(() => { cb.current = fn; });
    useEffect(() => {
        const id = setInterval(() => cb.current(), ms);
        return () => clearInterval(id);
    }, [ms]);
}

/* =============================================================================
   COLOR SYSTEM — Status & Event mappings with glow support
   ============================================================================= */

const STATUS_CONFIG = {
    COMPLETED:    { color: '#22c55e', glow: 'var(--glow-green)',  bg: 'rgba(34,197,94,0.12)' },
    FAILED:       { color: '#ef4444', glow: 'var(--glow-red)',    bg: 'rgba(239,68,68,0.12)' },
    RUNNING:      { color: '#f59e0b', glow: 'var(--glow-amber)',  bg: 'rgba(245,158,11,0.12)' },
    PENDING:      { color: '#8b5cf6', glow: 'var(--glow-purple)', bg: 'rgba(139,92,246,0.12)' },
    QUEUED:       { color: '#a78bfa', glow: 'var(--glow-purple)', bg: 'rgba(167,139,250,0.12)' },
    CREATED:      { color: '#64748b', glow: '',                 bg: 'rgba(100,116,139,0.12)' },
    SCHEDULED:    { color: '#0ea5e9', glow: 'var(--glow-blue)',   bg: 'rgba(14,165,233,0.12)' },
    WAITING_APPROVAL: { color: '#f59e0b', glow: 'var(--glow-amber)', bg: 'rgba(245,158,11,0.12)' },
    WAITING_DELAY:{ color: '#94a3b8', glow: '',                 bg: 'rgba(148,163,184,0.12)' },
    RESUMING:     { color: '#06b6d4', glow: 'var(--glow-cyan)',   bg: 'rgba(6,182,212,0.12)' },
    CANCELLED:    { color: '#8888aa', glow: '',                 bg: 'rgba(136,136,170,0.12)' },
    ACTIVE:       { color: '#22c55e', glow: 'var(--glow-green)',  bg: 'rgba(34,197,94,0.12)' },
    INACTIVE:     { color: '#64748b', glow: '',                 bg: 'rgba(100,116,139,0.12)' },
    ROLLED_BACK:  { color: '#8888aa', glow: '',                 bg: 'rgba(136,136,170,0.12)' },
    ROLLING_BACK: { color: '#f59e0b', glow: 'var(--glow-amber)',  bg: 'rgba(245,158,11,0.12)' },
    APPROVED:     { color: '#22c55e', glow: 'var(--glow-green)',  bg: 'rgba(34,197,94,0.12)' },
    REJECTED:     { color: '#ef4444', glow: 'var(--glow-red)',    bg: 'rgba(239,68,68,0.12)' },
    EXPIRED:      { color: '#8888aa', glow: '',                 bg: 'rgba(136,136,170,0.12)' },
};

const EVENT_COLOR = {
    'run.started': '#8b5cf6',
    'run.completed': '#22c55e',
    'run.failed': '#ef4444',
    'run.cancelled': '#8888aa',
    'run.resuming': '#06b6d4',
    'turn.started': '#3b82f6',
    'turn.completed': '#06b6d4',
    'tool.called': '#f59e0b',
    'tool.result': '#22c55e',
    'tool.error': '#ef4444',
    'token.usage': '#64748b',
    'budget.warning': '#f59e0b',
    'budget.exceeded': '#ef4444',
    'approval.requested': '#f59e0b',
    'approval.resolved': '#22c55e',
    'approval.expired': '#ef4444',
    'execution.waiting': '#94a3b8',
};

/* =============================================================================
   GLASS BADGE — Status indicator with inner glow
   ============================================================================= */

function Badge({ status }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.CREATED;
    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            background: cfg.bg,
            color: cfg.color,
            border: `1px solid ${cfg.color}33`,
            boxShadow: `0 0 12px ${cfg.color}22`,
            backdropFilter: 'blur(8px)',
        }}>
            <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: cfg.color,
                boxShadow: `0 0 8px ${cfg.color}`,
            }}/>
            {status}
        </span>
    );
}

/* =============================================================================
   SPARKLINE — Tiny trend visualization
   ============================================================================= */

function Sparkline({ data, color = '#8b5cf6', width = 80, height = 24 }) {
    if (!data || data.length < 2) return <div style={{ width, height }} />;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((v - min) / range) * (height - 4) - 2;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={width} height={height} style={{ opacity: 0.7 }}>
            <defs>
                <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.5" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
            />
            <polygon
                points={`0,${height} ${points} ${width},${height}`}
                fill={`url(#spark-${color.replace('#', '')})`}
                opacity="0.3"
            />
        </svg>
    );
}

/* =============================================================================
   METRIC CARD — PRD-aligned intelligence unit
   ============================================================================= */

function MetricCard({ label, value, sub, identity = 'purple', sparklineData }) {
    const identities = {
        purple: { color: '#8b5cf6', glow: 'var(--glow-purple)' },
        green:  { color: '#22c55e', glow: 'var(--glow-green)' },
        blue:   { color: '#3b82f6', glow: 'var(--glow-blue)' },
        amber:  { color: '#f59e0b', glow: 'var(--glow-amber)' },
        cyan:   { color: '#06b6d4', glow: 'var(--glow-cyan)' },
        red:    { color: '#ef4444', glow: 'var(--glow-red)' },
    };
    const id = identities[identity] ?? identities.purple;

    return (
        <div className="metric-card glass hover-lift" style={{ position: 'relative', overflow: 'hidden' }}>
            <div className="ambient-glow" style={{
                position: 'absolute',
                top: '-40%',
                left: '-20%',
                width: '70%',
                height: '80%',
                borderRadius: '50%',
                background: id.color,
                filter: 'blur(40px)',
                opacity: 0.25,
                pointerEvents: 'none',
                transition: 'opacity 0.3s ease',
            }}/>
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className="metric-title">{label}</span>
                    {sparklineData && <Sparkline data={sparklineData} color={id.color} />}
                </div>
                <div>
                    <div className="metric-value">{value}</div>
                    {sub && <div className="metric-sub">{sub}</div>}
                </div>
            </div>
        </div>
    );
}

/* =============================================================================
   SIDEBAR — Floating control plane
   ============================================================================= */

function Sidebar({ activeTab, onTabChange, pendingCount }) {
    const items = [
        { key: 'runs', label: 'Runs', icon: '▶' },
        { key: 'events', label: 'Events', icon: '◉' },
        { key: 'pipelines', label: 'Pipelines', icon: '◎' },
        { key: 'deployments', label: 'Deployments', icon: '◈' },
        { key: 'approvals', label: 'Approvals', icon: '◉', badge: pendingCount },
    ];

    return (
        <div className="sidebar-glass">
            <div style={{ marginBottom: 'var(--space-6)' }}>
                <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#fff',
                    boxShadow: '0 0 20px rgba(99,102,241,0.4)',
                    marginBottom: 'var(--space-4)',
                }}>A</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                    Agent-OS
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '0.04em' }}>
                    v3.0.0 · M0
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                {items.map(item => (
                    <div
                        key={item.key}
                        className={`sidebar-item ${activeTab === item.key ? 'active' : ''}`}
                        onClick={() => onTabChange(item.key)}
                        style={{ position: 'relative' }}
                    >
                        <span className="sidebar-icon" style={{ fontSize: 14, width: 20, textAlign: 'center' }}>
                            {item.icon}
                        </span>
                        <span style={{ position: 'relative', zIndex: 1 }}>{item.label}</span>
                        {item.badge > 0 && (
                            <span style={{
                                marginLeft: 'auto',
                                background: 'var(--amber)',
                                color: '#000',
                                borderRadius: 8,
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '2px 6px',
                                minWidth: 16,
                                textAlign: 'center',
                                boxShadow: '0 0 8px var(--glow-amber)',
                            }}>{item.badge}</span>
                        )}
                    </div>
                ))}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--glass-border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                    PRD §26.3 Compliant
                </div>
            </div>
        </div>
    );
}

/* =============================================================================
   TOP NAVIGATION — Search capsule + live status + notifications
   ============================================================================= */

function TopBar({ liveIndicator, onDemoRun }) {
    return (
        <div className="glass-xl" style={{
            margin: '12px 16px 0 296px',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            height: 56,
            flexShrink: 0,
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Top highlight */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 20,
                right: 20,
                height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            }}/>

            {/* Search capsule */}
            <div className="search-capsule">
                <span style={{ opacity: 0.5 }}>🔍</span>
                <input type="text" placeholder="Search runs, agents, events..." />
            </div>

            <div style={{ flex: 1 }} />

            {/* Live indicator */}
            <div className="glass-sm" style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 20,
            }}>
                <span className={liveIndicator ? 'live-pulse' : ''} style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: liveIndicator ? '#22c55e' : '#3f3f52',
                    transition: 'background 0.3s',
                    display: 'inline-block',
                    boxShadow: liveIndicator ? '0 0 12px var(--glow-green)' : 'none',
                }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>LIVE</span>
            </div>

            {/* Notification bell */}
            <div className="notification-bell">
                <span style={{ fontSize: 16 }}>🔔</span>
                <div className="notification-badge">3</div>
            </div>

            <button
                onClick={() => void onDemoRun()}
                className="glass hover-glow"
                style={{
                    padding: '8px 18px',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.2))',
                    color: '#fff',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid rgba(99,102,241,0.4)',
                    boxShadow: '0 0 20px rgba(99,102,241,0.2)',
                }}
            >
                + Demo Run
            </button>
        </div>
    );
}

/* =============================================================================
   TABLE COMPONENTS — Execution ledger with glow-based hierarchy
   ============================================================================= */

function RunRow({ run, selected, onClick }) {
    const dur = run.completed_at && run.started_at
        ? ((run.completed_at - run.started_at) / 1000).toFixed(1) + 's'
        : run.status === 'RUNNING' ? '…' : '—';

    return (
        <tr
            onClick={onClick}
            className={selected ? 'selected' : ''}
            style={{
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                position: 'relative',
            }}
        >
            <td style={{ padding: '14px 20px', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#a5b4fc' }}>
                {run.id.slice(0, 8)}
            </td>
            <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>
                {run.agent_id}
            </td>
            <td style={{ padding: '14px 20px' }}>
                <Badge status={run.status} />
            </td>
            <td style={{ padding: '14px 20px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                {(run.total_tokens ?? 0).toLocaleString()}
            </td>
            <td style={{ padding: '14px 20px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                {dur}
            </td>
            <td style={{ padding: '14px 20px', fontSize: 12, color: 'var(--text-tertiary)' }}>
                {run.created_at ? new Date(run.created_at).toLocaleTimeString() : '—'}
            </td>
        </tr>
    );
}

function EventRow({ event }) {
    const color = EVENT_COLOR[event.type] ?? '#8888aa';
    let data = {};
    try { data = JSON.parse(event.data_json); } catch { /* empty */ }
    const preview = Object.keys(data).length > 0 ? JSON.stringify(data).slice(0, 100) : '';

    return (
        <tr className="live-insert" style={{ position: 'relative' }}>
            <td style={{ padding: '12px 20px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
                {event.timestamp ? new Date(event.timestamp).toISOString().slice(11, 23) : '—'}
            </td>
            <td style={{ padding: '12px 20px' }}>
                <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11, color,
                    background: color + '18', padding: '3px 8px', borderRadius: 4,
                    border: `1px solid ${color}30`,
                }}>{event.type}</span>
            </td>
            <td style={{
                padding: '12px 20px',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--text-tertiary)',
                maxWidth: 320,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
            }}>
                {preview}
            </td>
        </tr>
    );
}

/* =============================================================================
   TIMELINE VIEW — Vertical spine with glowing nodes
   ============================================================================= */

function TimelineView({ events }) {
    return (
        <div className="timeline" style={{ padding: '20px 24px' }}>
            {events.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: 13, padding: '40px 0' }}>
                    No events yet.
                </div>
            ) : events.map((ev, i) => {
                const color = EVENT_COLOR[ev.type] ?? '#8888aa';
                let data = {};
                try { data = JSON.parse(ev.data_json); } catch { /* empty */ }
                return (
                    <div
                        key={ev.id}
                        className="timeline-node entry-animate"
                        style={{
                            color,
                            animationDelay: `${i * 0.05}s`,
                        }}
                    >
                        <div style={{
                            background: 'var(--glass-bg)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '12px 16px',
                            transition: 'all 0.2s ease',
                        }}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
                                <span style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 11,
                                    color,
                                    fontWeight: 600,
                                }}>{ev.type}</span>
                                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                                    {ev.timestamp ? new Date(ev.timestamp).toISOString().slice(11, 23) : ''}
                                </span>
                            </div>
                            {Object.keys(data).length > 0 && (
                                <div style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 10,
                                    color: 'var(--text-tertiary)',
                                }}>
                                    {JSON.stringify(data).slice(0, 140)}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* =============================================================================
   VIEW COMPONENTS — Deployments, Approvals, Pipelines
   ============================================================================= */

function DeploymentsView({ deployments, onRefresh }) {
    const [rolling, setRolling] = useState(null);

    const handleRollback = async (id) => {
        if (!confirm(`Roll back deployment ${id.slice(0, 8)}?`)) return;
        setRolling(id);
        try {
            const r = await fetch(`${API}/deployments/${id}/rollback`, { method: 'POST' });
            if (!r.ok) { const err = await r.json(); alert(`Rollback failed: ${err.error}`); }
            onRefresh();
        } catch (err) { alert(`Rollback failed: ${String(err)}`); }
        finally { setRolling(null); }
    };

    const createDemo = async () => {
        await fetch(`${API}/deployments/demo`, { method: 'POST' });
        onRefresh();
    };

    return (
        <div>
            <div style={{
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
            }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                    Deployment history with rollback support
                </span>
                <button onClick={createDemo} className="glass hover-glow" style={{
                    marginLeft: 'auto',
                    padding: '8px 16px',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: 'rgba(99,102,241,0.2)',
                    border: '1px solid rgba(99,102,241,0.4)',
                }}>
                    + Demo Deployment
                </button>
            </div>
            <table className="table-glass">
                <thead>
                    <tr>
                        {['ID', 'Agent', 'Version', 'Status', 'Target', 'Deployed By', 'Created', 'Actions'].map(h => (
                            <th key={h}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {deployments.length === 0 ? (
                        <tr>
                            <td colSpan={8} style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                No deployments. Click <strong>+ Demo Deployment</strong> to create one.
                            </td>
                        </tr>
                    ) : deployments.map(dep => (
                        <tr key={dep.id}>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#a5b4fc' }}>
                                {dep.id.slice(0, 8)}
                            </td>
                            <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{dep.agent_id}</td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>v{dep.version}</td>
                            <td><Badge status={dep.status} /></td>
                            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{dep.target}</td>
                            <td style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{dep.deployed_by ?? '—'}</td>
                            <td style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                                {new Date(dep.created_at).toLocaleString()}
                            </td>
                            <td>
                                {dep.status === 'ACTIVE' && (
                                    <button onClick={() => void handleRollback(dep.id)} disabled={rolling === dep.id}
                                        className="glass-sm hover-glow" style={{
                                            padding: '4px 12px', fontSize: 11, fontWeight: 600, color: '#f97316',
                                            background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)',
                                            cursor: 'pointer',
                                        }}>
                                        {rolling === dep.id ? '…' : 'Rollback'}
                                    </button>
                                )}
                                {dep.rollback_of && (
                                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>↩ {dep.rollback_of.slice(0, 6)}</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function ApprovalsView({ approvals, onRefresh }) {
    const [resolving, setResolving] = useState(null);

    const resolve = async (id, decision) => {
        setResolving(id);
        try {
            const r = await fetch(`${API}/approvals/${id}/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ decision, resolvedBy: 'dashboard-user' }),
            });
            if (!r.ok) { const err = await r.json(); alert(`Failed: ${err.error}`); }
            onRefresh();
        } catch (err) { alert(`Failed: ${String(err)}`); }
        finally { setResolving(null); }
    };

    const createDemo = async () => {
        await fetch(`${API}/approvals/demo`, { method: 'POST' });
        onRefresh();
    };

    const pending = approvals.filter(a => a.status === 'PENDING').length;

    return (
        <div>
            <div style={{
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
            }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                    {pending > 0 ? (
                        <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                            ⚠ {pending} pending approval{pending !== 1 ? 's' : ''} require action
                        </span>
                    ) : 'Approval queue — all clear'}
                </span>
                <button onClick={createDemo} className="glass hover-glow" style={{
                    marginLeft: 'auto', padding: '8px 16px', color: '#fff', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)',
                }}>
                    + Demo Approval
                </button>
            </div>
            <table className="table-glass">
                <thead><tr>
                    {['ID', 'Execution', 'Step', 'Reason', 'Status', 'Expires', 'Resolved By', 'Actions'].map(h => (
                        <th key={h}>{h}</th>
                    ))}
                </tr></thead>
                <tbody>
                    {approvals.length === 0 ? (
                        <tr>
                            <td colSpan={8} style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                No approval requests. Click <strong>+ Demo Approval</strong> to create one.
                            </td>
                        </tr>
                    ) : approvals.map(a => {
                        const expired = a.expires_at && a.expires_at < Date.now();
                        return (
                            <tr key={a.id} style={{ background: a.status === 'PENDING' && !expired ? 'rgba(245,158,11,0.03)' : 'transparent' }}>
                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#a5b4fc' }}>{a.id.slice(0, 8)}</td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>{a.execution_id.slice(0, 8)}</td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{a.step_id}</td>
                                <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.reason}</td>
                                <td><Badge status={expired && a.status === 'PENDING' ? 'EXPIRED' : a.status} /></td>
                                <td style={{ fontSize: 11, color: expired ? '#ef4444' : 'var(--text-tertiary)' }}>
                                    {a.expires_at ? new Date(a.expires_at).toLocaleString() : '—'}
                                </td>
                                <td style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{a.resolved_by ?? '—'}</td>
                                <td style={{ display: 'flex', gap: 8 }}>
                                    {a.status === 'PENDING' && !expired && (
                                        <>
                                            <button onClick={() => void resolve(a.id, 'APPROVED')} disabled={resolving === a.id}
                                                className="glass-sm hover-glow" style={{
                                                    padding: '4px 12px', fontSize: 11, fontWeight: 600, color: '#22c55e',
                                                    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', cursor: 'pointer',
                                                }}>{resolving === a.id ? '…' : 'Approve'}</button>
                                            <button onClick={() => void resolve(a.id, 'REJECTED')} disabled={resolving === a.id}
                                                className="glass-sm hover-glow" style={{
                                                    padding: '4px 12px', fontSize: 11, fontWeight: 600, color: '#ef4444',
                                                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer',
                                                }}>Reject</button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function PipelinesView({ pipelines }) {
    return (
        <div>
            <div style={{ padding: '20px 24px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Recent pipeline runs</span>
            </div>
            <table className="table-glass">
                <thead><tr>
                    {['Run ID', 'Pipeline', 'Version', 'Status', 'Step', 'Tokens', 'Created'].map(h => (
                        <th key={h}>{h}</th>
                    ))}
                </tr></thead>
                <tbody>
                    {pipelines.length === 0 ? (
                        <tr>
                            <td colSpan={7} style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                No pipeline runs yet.
                            </td>
                        </tr>
                    ) : pipelines.map(p => (
                        <tr key={p.id}>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#a5b4fc' }}>{p.id.slice(0, 8)}</td>
                            <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{p.pipeline_id}</td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{p.pipeline_version ?? '—'}</td>
                            <td><Badge status={p.status} /></td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>#{p.current_step_index}</td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{(p.total_tokens ?? 0).toLocaleString()}</td>
                            <td style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{new Date(p.created_at).toLocaleTimeString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* =============================================================================
   MAIN APP — PRD-Aligned Glass Shell
   ============================================================================= */

export default function App() {
    const [tab, setTab] = useState('runs');
    const [runs, setRuns] = useState([]);
    const [events, setEvents] = useState([]);
    const [pipelines, setPipelines] = useState([]);
    const [deployments, setDeployments] = useState([]);
    const [approvals, setApprovals] = useState([]);
    const [stats, setStats] = useState(null);
    const [selectedRun, setSelectedRun] = useState(null);
    const [runEvents, setRunEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [liveIndicator, setLiveIndicator] = useState(false);

    // All data fetching — preserved exactly
    const fetchRuns = useCallback(async () => {
        try { const r = await fetch(`${API}/runs?limit=50`); if (r.ok) setRuns(await r.json()); }
        catch { /* ignore */ }
    }, []);

    const fetchEvents = useCallback(async () => {
        try { const r = await fetch(`${API}/events?limit=100`); if (r.ok) setEvents(await r.json()); }
        catch { /* ignore */ }
    }, []);

    const fetchPipelines = useCallback(async () => {
        try { const r = await fetch(`${API}/pipelines`); if (r.ok) setPipelines(await r.json()); }
        catch { /* ignore */ }
    }, []);

    const fetchDeployments = useCallback(async () => {
        try { const r = await fetch(`${API}/deployments`); if (r.ok) setDeployments(await r.json()); }
        catch { /* ignore */ }
    }, []);

    const fetchApprovals = useCallback(async () => {
        try { const r = await fetch(`${API}/approvals`); if (r.ok) setApprovals(await r.json()); }
        catch { /* ignore */ }
    }, []);

    const fetchStats = useCallback(async () => {
        try { const r = await fetch(`${API}/stats`); if (r.ok) setStats(await r.json()); }
        catch { /* ignore */ }
    }, []);

    const fetchRunEvents = useCallback(async (runId) => {
        try { const r = await fetch(`${API}/runs/${runId}/events`); if (r.ok) setRunEvents(await r.json()); }
        catch { /* ignore */ }
    }, []);

    const refreshAll = useCallback(async () => {
        await Promise.all([fetchRuns(), fetchStats(), fetchDeployments(), fetchApprovals(), fetchPipelines()]);
    }, [fetchRuns, fetchStats, fetchDeployments, fetchApprovals, fetchPipelines]);

    // Initial load
    useEffect(() => {
        Promise.all([fetchRuns(), fetchEvents(), fetchStats(), fetchDeployments(), fetchApprovals(), fetchPipelines()])
            .finally(() => setLoading(false));
    }, [fetchRuns, fetchEvents, fetchStats, fetchDeployments, fetchApprovals, fetchPipelines]);

    // Polling
    useInterval(() => {
        void fetchRuns();
        void fetchStats();
        if (tab === 'approvals') void fetchApprovals();
        if (tab === 'deployments') void fetchDeployments();
        if (tab === 'pipelines') void fetchPipelines();
    }, 5000);

    // SSE
    useEffect(() => {
        const es = new EventSource(`${API}/sse`);
        es.onmessage = (e) => {
            try {
                JSON.parse(e.data);
                setLiveIndicator(true);
                setTimeout(() => setLiveIndicator(false), 800);
                void fetchRuns();
                void fetchStats();
                void fetchApprovals();
            } catch { /* ignore */ }
        };
        return () => es.close();
    }, [fetchRuns, fetchStats, fetchApprovals]);

    // Run detail events
    useEffect(() => {
        if (selectedRun) void fetchRunEvents(selectedRun.id);
    }, [selectedRun, fetchRunEvents]);

    const handleSelectRun = (run) => {
        setSelectedRun(prev => prev?.id === run.id ? null : run);
    };

    const spawnDemo = async () => {
        await fetch(`${API}/runs/demo`, { method: 'POST' });
        await Promise.all([fetchRuns(), fetchStats(), fetchEvents()]);
    };

    const statusCounts = stats?.runs.byStatus ?? [];
    const getCount = (s) => statusCounts.find(x => x.status === s)?.count ?? 0;
    const pendingApprovals = stats?.approvals?.pending ?? 0;

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' }}>
            {/* Ambient background layer */}
            <div className="ambient-layer" />

            {/* Sidebar */}
            <Sidebar activeTab={tab} onTabChange={setTab} pendingCount={pendingApprovals} />

            {/* Main content area */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                marginLeft: 280,
                position: 'relative',
                zIndex: 1,
            }}>
                {/* Top bar */}
                <TopBar liveIndicator={liveIndicator} onDemoRun={spawnDemo} />

                {/* Metric grid */}
                <div className="metric-grid" style={{
                    padding: '12px 16px',
                    gap: 'var(--space-4)',
                }}>
                    <MetricCard label="Total Runs" value={stats?.runs.total ?? 0} identity="purple" />
                    <MetricCard label="Completed" value={getCount('COMPLETED')} sub="successful" identity="green" />
                    <MetricCard label="Failed" value={getCount('FAILED')} sub="errors" identity="red" />
                    <MetricCard label="Running" value={getCount('RUNNING')} sub="active" identity="amber" />
                    <MetricCard label="Total Tokens" value={(stats?.tokens.total ?? 0).toLocaleString()} sub="all time" identity="blue" />
                    <MetricCard label="Events/h" value={stats?.events.lastHour ?? 0} sub="last hour" identity="cyan" />
                    <MetricCard label="Approvals" value={pendingApprovals} sub="pending" identity="amber" />
                    <MetricCard label="Deployments" value={stats?.deployments?.active ?? 0} sub="active" identity="purple" />
                </div>

                {/* Content area */}
                <div style={{
                    display: 'flex',
                    flex: 1,
                    overflow: 'hidden',
                    padding: '0 16px 16px',
                    gap: 12,
                }}>
                    {/* Primary content */}
                    <div className="glass-lg" style={{
                        flex: selectedRun && tab === 'runs' ? '0 0 58%' : 1,
                        overflow: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                    }}>
                        {loading ? (
                            <div style={{ padding: 64, textAlign: 'center', color: 'var(--text-secondary)' }}>
                                <div style={{
                                    width: 40, height: 40,
                                    border: '2px solid rgba(255,255,255,0.1)',
                                    borderTopColor: '#8b5cf6',
                                    borderRadius: '50%',
                                    margin: '0 auto 16px',
                                    animation: 'spin 1s linear infinite',
                                }}/>
                                Loading…
                            </div>
                        ) : tab === 'runs' ? (
                            <table className="table-glass">
                                <thead><tr>
                                    {['Run ID', 'Agent', 'Status', 'Tokens', 'Duration', 'Created'].map(h => (
                                        <th key={h}>{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody>
                                    {runs.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ padding: '64px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                No runs yet. Click <strong>+ Demo Run</strong> to create one.
                                            </td>
                                        </tr>
                                    ) : runs.map(run => (
                                        <RunRow key={run.id} run={run} selected={selectedRun?.id === run.id} onClick={() => handleSelectRun(run)} />
                                    ))}
                                </tbody>
                            </table>
                        ) : tab === 'events' ? (
                            <TimelineView events={events} />
                        ) : tab === 'pipelines' ? (
                            <PipelinesView pipelines={pipelines} />
                        ) : tab === 'deployments' ? (
                            <DeploymentsView deployments={deployments} onRefresh={() => void refreshAll()} />
                        ) : (
                            <ApprovalsView approvals={approvals} onRefresh={() => void refreshAll()} />
                        )}
                    </div>

                    {/* Run detail panel */}
                    {selectedRun && tab === 'runs' && (
                        <div className="glass-xl" style={{
                            flex: '0 0 38%',
                            overflow: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                        }}>
                            <div style={{
                                padding: '20px 24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Run Detail</div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#a5b4fc', marginTop: 4 }}>
                                        {selectedRun.id}
                                    </div>
                                </div>
                                <button onClick={() => setSelectedRun(null)} style={{
                                    color: 'var(--text-tertiary)', fontSize: 20, background: 'none', border: 'none',
                                    cursor: 'pointer', padding: '4px 8px', borderRadius: 6, transition: 'all 0.15s',
                                }} onMouseEnter={e => e.target.style.color = 'var(--text-primary)'}
                                onMouseLeave={e => e.target.style.color = 'var(--text-tertiary)'}>×</button>
                            </div>

                            <div style={{ padding: '20px 24px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    {[
                                        ['Agent', selectedRun.agent_id],
                                        ['Status', ''],
                                        ['Tokens', (selectedRun.total_tokens ?? 0).toLocaleString()],
                                        ['Version', selectedRun.agent_version ?? '—'],
                                        ['Created', selectedRun.created_at ? new Date(selectedRun.created_at).toLocaleString() : '—'],
                                        ['Correlation', selectedRun.correlation_id ? selectedRun.correlation_id.slice(0, 12) + '…' : '—'],
                                    ].map(([label, value], i) => (
                                        <div key={i}>
                                            <div style={{
                                                fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 6,
                                                textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
                                            }}>{label}</div>
                                            {label === 'Status' ? <Badge status={selectedRun.status} /> : (
                                                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500,
                                                    fontFamily: label === 'Correlation' ? 'var(--font-mono)' : undefined }}>{value}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {selectedRun.output_json && (
                                <div style={{ padding: '20px 24px' }}>
                                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Output</div>
                                    <pre style={{
                                        fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)',
                                        background: 'rgba(0,0,0,0.3)', padding: 14, borderRadius: 10, overflow: 'auto',
                                        maxHeight: 140, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                    }}>
                                        {(() => { try { return JSON.stringify(JSON.parse(selectedRun.output_json), null, 2); } catch { return selectedRun.output_json; } })()}
                                    </pre>
                                </div>
                            )}

                            {selectedRun.error_message && (
                                <div style={{ padding: '20px 24px' }}>
                                    <div style={{ fontSize: 10, color: '#ef4444', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Error</div>
                                    <pre style={{
                                        fontFamily: 'var(--font-mono)', fontSize: 12, color: '#ef4444',
                                        background: 'rgba(239,68,68,0.08)', padding: 14, borderRadius: 10,
                                        overflow: 'auto', maxHeight: 120, whiteSpace: 'pre-wrap',
                                        border: '1px solid rgba(239,68,68,0.15)',
                                    }}>{selectedRun.error_message}</pre>
                                </div>
                            )}

                            <div style={{ padding: '20px 24px', flex: 1 }}>
                                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                                    Events ({runEvents.length})
                                </div>
                                {runEvents.length === 0 ? (
                                    <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No events</div>
                                ) : runEvents.map((ev, i) => {
                                    const color = EVENT_COLOR[ev.type] ?? '#8888aa';
                                    let data = {};
                                    try { data = JSON.parse(ev.data_json); } catch { /* empty */ }
                                    return (
                                        <div key={ev.id} className="live-insert" style={{
                                            display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start',
                                            padding: '10px 14px', borderRadius: 10,
                                            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                                            animationDelay: `${i * 0.03}s`,
                                        }}>
                                            <div style={{
                                                width: 10, height: 10, borderRadius: '50%', background: color,
                                                marginTop: 4, flexShrink: 0, boxShadow: `0 0 10px ${color}66`,
                                            }}/>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color, fontWeight: 600 }}>{ev.type}</span>
                                                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                                                        {ev.timestamp ? new Date(ev.timestamp).toISOString().slice(11, 23) : ''}
                                                    </span>
                                                </div>
                                                {Object.keys(data).length > 0 && (
                                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>
                                                        {JSON.stringify(data).slice(0, 140)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

/* =============================================================================
   ENTERPRISE MIGRATION NOTES — Preserved
   ============================================================================= */
