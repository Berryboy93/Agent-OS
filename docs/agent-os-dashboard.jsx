import { useState, useEffect, useMemo } from "react";
import {
  LayoutGrid, Play, Bot, Wrench, ShieldCheck, Package, GitBranch,
  BarChart3, Bell, Settings, Search, Sun, ChevronRight, ChevronLeft,
  Copy, ExternalLink, Layers, CheckCircle, Users, Cpu, ArrowUp,
  ArrowDown, Minus, ChevronDown, Terminal, Circle, Activity
} from "lucide-react";

const T = {
  bg0: "#030712", bg1: "#040b18", bg2: "#071326",
  glass: "rgba(255,255,255,0.035)", glassMid: "rgba(7,19,38,0.85)",
  border: "rgba(255,255,255,0.075)", borderHi: "rgba(255,255,255,0.13)",
  purple: "#8b5cf6", green: "#22c55e", blue: "#3b82f6",
  amber: "#f59e0b", red: "#ef4444", cyan: "#06b6d4",
  text: "#e2e8f0", muted: "rgba(226,232,240,0.52)", faint: "rgba(226,232,240,0.28)",
};

const rgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};

const METRICS = [
  { label: "Total Runs", value: "4,182", change: "+18%", trend: "up", sub: "from last 24h", color: T.purple, icon: Activity, data: [42,55,50,68,62,80,73,92,85,100,96,115] },
  { label: "Success Rate", value: "96.4%", change: "+2.1%", trend: "up", sub: "from last 24h", color: T.green, icon: CheckCircle, data: [88,91,89,93,91,94,95,93,95,94,96,97] },
  { label: "Total Tokens", value: "2.74M", change: "-5%", trend: "down", sub: "from last 24h", color: T.blue, icon: Layers, data: [100,96,92,94,86,88,82,78,75,72,70,68] },
  { label: "Active Agents", value: "24", change: "No change", trend: "flat", sub: "", color: T.amber, icon: Users, data: [22,24,23,25,24,24,23,25,24,24,25,24] },
];

const RUNS = [
  { id: "run_8f3a1b2c", agent: "research-agent", status: "completed", tokens: 24532, dur: "28.4s", at: "10:24:15 AM" },
  { id: "run_a7d9e3f1", agent: "code-agent", status: "running", tokens: 12983, dur: "—", at: "10:24:10 AM" },
  { id: "run_c3b2d1f4", agent: "devops-agent", status: "failed", tokens: 8421, dur: "12.7s", at: "10:23:58 AM" },
  { id: "run_d4e5f6a7", agent: "research-agent", status: "completed", tokens: 31421, dur: "45.2s", at: "10:23:45 AM" },
  { id: "run_e5f6a7b8", agent: "code-agent", status: "completed", tokens: 15892, dur: "22.1s", at: "10:23:31 AM" },
];

const SEED_EVENTS = [
  { id: 1, type: "run.completed", desc: "Run run_8f3a1b2c completed successfully", time: "10:24:15 AM", cat: "run", color: T.green },
  { id: 2, type: "tool.called", desc: "code_interpreter.execute", time: "10:24:12 AM", cat: "tool", color: T.amber },
  { id: 3, type: "tool.result", desc: "code_interpreter.execute completed", time: "10:24:11 AM", cat: "tool", color: T.green },
  { id: 4, type: "turn.completed", desc: "Turn 3 completed", time: "10:24:10 AM", cat: "turn", color: T.blue },
  { id: 5, type: "turn.started", desc: "Turn 3 started", time: "10:24:08 AM", cat: "turn", color: T.purple },
  { id: 6, type: "run.started", desc: "Run run_8f3a1b2c started", time: "10:24:05 AM", cat: "run", color: T.blue },
];

const TIMELINE_NODES = [
  { label: "Run Started", time: "10:23:45 AM", color: T.purple },
  { label: "Turn 1", time: "10:23:46 AM", color: T.blue },
  { label: "Tool Call", time: "10:23:48 AM", color: T.amber },
  { label: "Tool Result", time: "10:23:50 AM", color: T.green },
  { label: "Turn 2", time: "10:23:52 AM", color: T.blue },
  { label: "Turn 3", time: "10:24:02 AM", color: T.blue },
  { label: "Completed", time: "10:24:15 AM", color: T.green, filled: true },
];

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "runs", label: "Runs", icon: Play },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "tools", label: "Tools", icon: Wrench },
  { id: "approvals", label: "Approvals", icon: ShieldCheck, badge: 3 },
  { id: "deployments", label: "Deployments", icon: Package },
  { id: "pipelines", label: "Pipelines", icon: GitBranch },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
];

const BADGE = {
  completed: { label: "COMPLETED", c: T.green },
  running: { label: "RUNNING", c: T.amber, dot: true },
  failed: { label: "FAILED", c: T.red },
};

function Sparkline({ data, color, w = 120, h = 40 }) {
  const uid = useMemo(() => "s" + Math.random().toString(36).slice(2, 9), []);
  const max = Math.max(...data), min = Math.min(...data), r = max - min || 1;
  const pts = data.map((v, i) => ({ x: (i / (data.length - 1)) * w, y: h - 5 - ((v - min) / r) * (h - 12) }));
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].x},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible", display: "block" }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${uid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatusBadge({ status }) {
  const cfg = BADGE[status] || BADGE.completed;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 6, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.065em", background: `rgba(${rgb(cfg.c)},0.12)`, color: cfg.c, border: `1px solid rgba(${rgb(cfg.c)},0.28)` }}>
      {cfg.dot && <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.c, animation: "blink 1.8s ease-in-out infinite" }} />}
      {cfg.label}
    </span>
  );
}

function EvtIcon({ type, cat, color }) {
  const Icon = type.includes("completed") ? CheckCircle : cat === "tool" ? Terminal : type.includes("started") ? Play : Circle;
  return (
    <div style={{ width: 31, height: 31, borderRadius: 8, flexShrink: 0, background: `rgba(${rgb(color)},0.1)`, border: `1px solid rgba(${rgb(color)},0.22)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon size={13} color={color} />
    </div>
  );
}

function Sidebar({ active, setActive }) {
  const [collapsed, setCollapsed] = useState(false);
  const W = collapsed ? 60 : 220;
  return (
    <aside style={{ width: W, minWidth: W, height: "100vh", background: T.bg1, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", transition: "width 0.28s ease, min-width 0.28s ease", overflow: "hidden", position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ padding: collapsed ? "18px 11px" : "18px 17px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: "linear-gradient(135deg,#8b5cf6,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 18px rgba(139,92,246,0.45)" }}>
          <Cpu size={17} color="#fff" />
        </div>
        {!collapsed && (
          <div>
            <div style={{ color: T.text, fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.01em" }}>Agent-OS</div>
            <div style={{ color: T.faint, fontSize: 9.5, letterSpacing: "0.07em" }}>Enterprise Edition</div>
          </div>
        )}
      </div>

      <nav style={{ flex: 1, padding: "10px 7px", overflowY: "auto", overflowX: "hidden" }}>
        {NAV.map(item => {
          const Icon = item.icon;
          const on = active === item.id;
          return (
            <button key={item.id} onClick={() => setActive(item.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: collapsed ? "9px 12px" : "9px 10px", borderRadius: 9, marginBottom: 2, border: "none", background: on ? "linear-gradient(135deg,rgba(139,92,246,0.22),rgba(99,102,241,0.1))" : "transparent", color: on ? "#c4b5fd" : T.muted, cursor: "pointer", textAlign: "left", transition: "all 0.15s", boxShadow: on ? "inset 0 0 0 1px rgba(139,92,246,0.28)" : "none", position: "relative" }}>
              {on && <div style={{ position: "absolute", left: 0, top: "22%", bottom: "22%", width: 3, borderRadius: 3, background: T.purple, boxShadow: `0 0 8px ${T.purple}` }} />}
              <Icon size={15} />
              {!collapsed && <span style={{ fontSize: 13, fontWeight: on ? 600 : 400, whiteSpace: "nowrap" }}>{item.label}</span>}
              {!collapsed && item.badge && <span style={{ marginLeft: "auto", minWidth: 19, height: 19, borderRadius: 10, background: T.purple, color: "#fff", fontSize: 10.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{item.badge}</span>}
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div style={{ margin: "0 8px 8px", padding: "12px 13px", borderRadius: 12, background: T.glass, border: `1px solid ${T.border}` }}>
          <div style={{ color: T.faint, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.09em", marginBottom: 7 }}>SYSTEM STATUS</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.green, boxShadow: `0 0 7px ${T.green}` }} />
            <span style={{ color: T.green, fontWeight: 600, fontSize: 12 }}>Healthy</span>
          </div>
          <div style={{ color: T.faint, fontSize: 10.5, marginBottom: 8 }}>All systems operational</div>
          <Sparkline data={[70, 75, 72, 78, 80, 76, 82, 80, 85, 83, 88, 85]} color={T.green} w={165} h={26} />
        </div>
      )}

      <div style={{ padding: collapsed ? "13px 12px" : "13px 14px", borderTop: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, color: "#fff" }}>AD</div>
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: T.text, fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Admin User</div>
            <div style={{ color: T.faint, fontSize: 10.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>admin@example.com</div>
          </div>
        )}
        {!collapsed && <ChevronDown size={13} color={T.faint} />}
      </div>

      <button onClick={() => setCollapsed(c => !c)} style={{ position: "absolute", bottom: 90, right: collapsed ? 9 : -11, width: 22, height: 22, borderRadius: "50%", background: T.bg2, border: `1px solid ${T.border}`, color: T.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20, transition: "right 0.28s ease" }}>
        {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
      </button>
    </aside>
  );
}

function TopBar() {
  return (
    <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "22px 26px 0", gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, color: T.text, fontSize: 24, fontWeight: 700, fontFamily: "'Syne',sans-serif", letterSpacing: "-0.025em", lineHeight: 1.15 }}>Overview</h1>
        <p style={{ margin: "5px 0 0", color: T.muted, fontSize: 13 }}>Real-time observability across your AI agents and workflows</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, paddingTop: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 13px", borderRadius: 10, background: T.glass, border: `1px solid ${T.border}`, minWidth: 185 }}>
          <Search size={13} color={T.faint} />
          <span style={{ color: T.faint, fontSize: 12.5, flex: 1 }}>Search anything...</span>
          <span style={{ padding: "2px 5px", borderRadius: 5, background: "rgba(255,255,255,0.06)", color: T.faint, fontSize: 10.5 }}>⌘K</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: 10, background: T.glass, border: `1px solid ${T.border}` }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.green, boxShadow: `0 0 8px ${T.green}`, animation: "blink 2s ease-in-out infinite" }} />
          <div>
            <div style={{ color: T.green, fontWeight: 600, fontSize: 11.5, lineHeight: 1.2 }}>Live</div>
            <div style={{ color: T.faint, fontSize: 10, lineHeight: 1.2 }}>Connected</div>
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <button style={{ width: 37, height: 37, borderRadius: 10, background: T.glass, border: `1px solid ${T.border}`, color: T.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Bell size={15} /></button>
          <span style={{ position: "absolute", top: -4, right: -4, minWidth: 17, height: 17, borderRadius: 9, background: T.purple, color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>3</span>
        </div>
        <button style={{ width: 37, height: 37, borderRadius: 10, background: T.glass, border: `1px solid ${T.border}`, color: T.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Sun size={15} /></button>
      </div>
    </header>
  );
}

function MetricCard({ m }) {
  const Icon = m.icon;
  return (
    <div style={{ background: T.glassMid, border: `1px solid ${T.border}`, borderRadius: 15, padding: "18px 18px 14px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -30, left: -30, width: 140, height: 140, borderRadius: "50%", background: `radial-gradient(circle,rgba(${rgb(m.color)},0.18) 0%,transparent 60%)`, pointerEvents: "none" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, position: "relative" }}>
        <div>
          <div style={{ color: T.muted, fontSize: 11.5, fontWeight: 500, marginBottom: 6 }}>{m.label}</div>
          <div style={{ color: T.text, fontSize: 28, fontWeight: 700, fontFamily: "'Syne',sans-serif", letterSpacing: "-0.03em", lineHeight: 1 }}>{m.value}</div>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: 9, background: `rgba(${rgb(m.color)},0.1)`, border: `1px solid rgba(${rgb(m.color)},0.2)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={17} color={m.color} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          {m.trend === "up" && <ArrowUp size={11} color={T.green} />}
          {m.trend === "down" && <ArrowDown size={11} color={T.red} />}
          {m.trend === "flat" && <Minus size={11} color={T.amber} />}
          <span style={{ fontSize: 11.5, fontWeight: 500, color: m.trend === "up" ? T.green : m.trend === "down" ? T.red : T.amber }}>{m.change}</span>
          {m.sub && <span style={{ color: T.faint, fontSize: 11.5 }}>&nbsp;{m.sub}</span>}
        </div>
        <Sparkline data={m.data} color={m.color} />
      </div>
    </div>
  );
}

function IconBtn({ children }) {
  return <button style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", color: T.faint, cursor: "pointer", borderRadius: 6 }}>{children}</button>;
}

function RecentRuns() {
  const [page, setPage] = useState(1);
  return (
    <div style={{ background: T.glassMid, border: `1px solid ${T.border}`, borderRadius: 15, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: `1px solid ${T.border}` }}>
        <span style={{ color: T.text, fontWeight: 600, fontSize: 14.5, fontFamily: "'Syne',sans-serif" }}>Recent Runs</span>
        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
          {["All Status", "All Agents"].map(l => (
            <button key={l} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, background: T.glass, border: `1px solid ${T.border}`, color: T.muted, fontSize: 11.5, cursor: "pointer" }}>
              {l} <ChevronDown size={11} />
            </button>
          ))}
          <button style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, background: T.glass, border: `1px solid rgba(${rgb(T.purple)},0.3)`, color: "#c4b5fd", fontSize: 11.5, cursor: "pointer" }}>
            View All Runs <ExternalLink size={11} />
          </button>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "20%" }} /><col style={{ width: "18%" }} /><col style={{ width: "16%" }} />
          <col style={{ width: "13%" }} /><col style={{ width: "12%" }} /><col style={{ width: "15%" }} /><col style={{ width: "6%" }} />
        </colgroup>
        <thead>
          <tr>{["RUN ID", "AGENT", "STATUS", "TOKENS", "DURATION", "CREATED AT", ""].map(c => (
            <th key={c} style={{ padding: "9px 15px", color: T.faint, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.1em", textAlign: "left", borderBottom: `1px solid ${T.border}` }}>{c}</th>
          ))}</tr>
        </thead>
        <tbody>
          {RUNS.map((r, i) => (
            <tr key={r.id} style={{ borderBottom: i < RUNS.length - 1 ? `1px solid ${T.border}` : "none", cursor: "pointer", transition: "background 0.12s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.022)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <td style={{ padding: "13px 15px" }}><span style={{ color: T.purple, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5, fontWeight: 500 }}>{r.id}</span></td>
              <td style={{ padding: "13px 15px", color: T.muted, fontSize: 12.5 }}>{r.agent}</td>
              <td style={{ padding: "13px 15px" }}><StatusBadge status={r.status} /></td>
              <td style={{ padding: "13px 15px", color: T.muted, fontSize: 12, fontFamily: "'IBM Plex Mono',monospace" }}>{r.tokens.toLocaleString()}</td>
              <td style={{ padding: "13px 15px", color: T.muted, fontSize: 12, fontFamily: "'IBM Plex Mono',monospace" }}>{r.dur}</td>
              <td style={{ padding: "13px 15px", color: T.faint, fontSize: 12 }}>{r.at}</td>
              <td style={{ padding: "13px 15px" }}><ChevronRight size={13} color={T.faint} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 18px", borderTop: `1px solid ${T.border}`, color: T.faint, fontSize: 12 }}>
        <span>Showing 5 of 4,182 runs</span>
        <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
          <IconBtn><ChevronLeft size={13} /></IconBtn>
          {[1, 2, 3].map(p => (
            <button key={p} onClick={() => setPage(p)} style={{ width: 28, height: 28, borderRadius: 6, background: p === page ? T.purple : "transparent", border: "none", color: p === page ? "#fff" : T.faint, fontSize: 12.5, cursor: "pointer", fontWeight: p === page ? 600 : 400 }}>{p}</button>
          ))}
          <span style={{ color: T.faint, padding: "0 3px" }}>...</span>
          <button style={{ width: 36, height: 28, borderRadius: 6, background: "transparent", border: "none", color: T.faint, fontSize: 12.5, cursor: "pointer" }}>837</button>
          <IconBtn><ChevronRight size={13} /></IconBtn>
        </div>
      </div>
    </div>
  );
}

function EventStream({ events }) {
  return (
    <div style={{ background: T.glassMid, border: `1px solid ${T.border}`, borderRadius: 15, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: `1px solid ${T.border}` }}>
        <span style={{ color: T.text, fontWeight: 600, fontSize: 14.5, fontFamily: "'Syne',sans-serif" }}>Event Stream</span>
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, boxShadow: `0 0 6px ${T.green}`, animation: "blink 1.5s ease-in-out infinite" }} />
          <span style={{ color: T.green, fontSize: 11.5, fontWeight: 600 }}>Live</span>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        {events.map((ev, i) => (
          <div key={ev.id} style={{ display: "flex", gap: 11, padding: "11px 15px", borderBottom: i < events.length - 1 ? `1px solid ${T.border}` : "none", alignItems: "flex-start", animation: i === 0 ? "slideIn 0.3s ease" : "none" }}>
            <EvtIcon type={ev.type} cat={ev.cat} color={ev.color} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: T.text, fontSize: 11.5, fontWeight: 600, fontFamily: "'IBM Plex Mono',monospace" }}>{ev.type}</div>
              <div style={{ color: T.faint, fontSize: 11, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.desc}</div>
            </div>
            <div style={{ color: T.faint, fontSize: 10.5, whiteSpace: "nowrap", flexShrink: 0, paddingTop: 1 }}>{ev.time}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "11px 18px", borderTop: `1px solid ${T.border}` }}>
        <button style={{ display: "flex", alignItems: "center", gap: 5, color: T.purple, background: "transparent", border: "none", fontSize: 12.5, cursor: "pointer", fontWeight: 500 }}>
          View full event log <ExternalLink size={12} />
        </button>
      </div>
    </div>
  );
}

function RunDetails() {
  const [tab, setTab] = useState("timeline");
  const tabs = [{ id: "timeline", label: "Timeline" }, { id: "turns", label: "Turns (3)" }, { id: "tools", label: "Tools (2)" }, { id: "logs", label: "Logs" }, { id: "metadata", label: "Metadata" }];
  return (
    <div style={{ background: T.glassMid, border: `1px solid ${T.border}`, borderRadius: 15, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 18px", borderBottom: `1px solid ${T.border}`, gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: T.text, fontWeight: 600, fontSize: 14.5, fontFamily: "'Syne',sans-serif" }}>Run Details</span>
          <StatusBadge status="completed" />
        </div>
        <div style={{ display: "flex" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "5px 12px", border: "none", background: "transparent", color: tab === t.id ? T.purple : T.muted, fontSize: 12.5, cursor: "pointer", borderBottom: tab === t.id ? `2px solid ${T.purple}` : "2px solid transparent", fontWeight: tab === t.id ? 600 : 400, transition: "all 0.12s" }}>{t.label}</button>
          ))}
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, background: T.glass, border: `1px solid ${T.border}`, color: T.muted, fontSize: 12, cursor: "pointer" }}>
          View Full Details <ExternalLink size={11} />
        </button>
      </div>

      <div style={{ padding: "11px 18px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ color: T.muted, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12 }}>run_8f3a1b2c-9d4e-4f7a-b8c2-1e5f6a7b8c9d</span>
          <Copy size={11} color={T.faint} style={{ cursor: "pointer" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr" }}>
        <div style={{ padding: "18px", borderRight: `1px solid ${T.border}` }}>
          {[["Agent", "research-agent", true], ["Started", "May 18, 2025 10:23:45 AM"], ["Duration", "28.4s"], ["Tokens Used", "24,532"], ["Cost", "$0.0432"]].map(([label, val, isAgent]) => (
            <div key={label} style={{ marginBottom: 13 }}>
              <div style={{ color: T.faint, fontSize: 10.5, marginBottom: 3, fontWeight: 500, letterSpacing: "0.03em" }}>{label}</div>
              <div style={{ color: isAgent ? T.purple : T.muted, fontSize: 12.5, fontWeight: 500, fontFamily: isAgent ? "inherit" : "'IBM Plex Mono',monospace" }}>{val}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: "32px 24px", display: "flex", alignItems: "center" }}>
          <div style={{ width: "100%", position: "relative" }}>
            <div style={{ position: "absolute", left: 13, right: 13, top: 12, height: 1, background: `linear-gradient(to right,${T.purple},${T.blue},${T.amber},${T.green},${T.blue},${T.blue},${T.green})`, opacity: 0.35 }} />
            <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
              {TIMELINE_NODES.map((n, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <div style={{ width: n.filled ? 26 : 20, height: n.filled ? 26 : 20, borderRadius: "50%", background: `rgba(${rgb(n.color)},0.12)`, border: `2px solid ${n.color}`, boxShadow: `0 0 ${n.filled ? 16 : 7}px rgba(${rgb(n.color)},0.55)`, position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                    {n.filled && <div style={{ width: 10, height: 10, borderRadius: "50%", background: n.color }} />}
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: T.text, fontSize: 10.5, fontWeight: 500, whiteSpace: "nowrap" }}>{n.label}</div>
                    <div style={{ color: T.faint, fontSize: 9.5 }}>{n.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState("overview");
  const [events, setEvents] = useState(SEED_EVENTS);

  useEffect(() => {
    const pool = [
      { type: "run.completed", desc: "Run completed successfully", cat: "run", color: T.green },
      { type: "tool.called", desc: "web_fetch.query executed", cat: "tool", color: T.amber },
      { type: "turn.started", desc: "New turn initiated", cat: "turn", color: T.purple },
      { type: "run.started", desc: "New agent run dispatched", cat: "run", color: T.blue },
      { type: "tool.result", desc: "tool execution returned", cat: "tool", color: T.green },
      { type: "turn.completed", desc: "Turn completed", cat: "turn", color: T.blue },
    ];
    const iv = setInterval(() => {
      const ev = pool[Math.floor(Math.random() * pool.length)];
      const t = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setEvents(prev => [{ ...ev, id: Date.now(), time: t }, ...prev.slice(0, 5)]);
    }, 3600);
    return () => clearInterval(iv);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Figtree:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{margin:0;background:${T.bg0}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes slideIn{from{opacity:0;transform:translateY(-7px)}to{opacity:1;transform:translateY(0)}}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px}
        nav button:hover{background:rgba(255,255,255,0.04)!important}
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh", background: T.bg0, fontFamily: "'Figtree',sans-serif", color: T.text, position: "relative", overflow: "hidden" }}>
        {/* Nebula ambient lights */}
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", top: "-12%", left: "20%", width: 460, height: 460, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,0.12) 0%,transparent 62%)" }} />
          <div style={{ position: "absolute", top: "18%", right: "-4%", width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle,rgba(6,182,212,0.07) 0%,transparent 62%)" }} />
          <div style={{ position: "absolute", bottom: "8%", left: "42%", width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle,rgba(59,130,246,0.07) 0%,transparent 62%)" }} />
          <div style={{ position: "absolute", top: "55%", left: "15%", width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,0.05) 0%,transparent 62%)" }} />
        </div>

        <Sidebar active={active} setActive={setActive} />

        <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative", zIndex: 1 }}>
          <TopBar />
          <div style={{ padding: "18px 26px 26px", display: "flex", flexDirection: "column", gap: 15 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
              {METRICS.map(m => <MetricCard key={m.label} m={m} />)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
              <RecentRuns />
              <EventStream events={events} />
            </div>
            <RunDetails />
          </div>
        </main>
      </div>
    </>
  );
}
