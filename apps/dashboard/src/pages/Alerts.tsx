import { useEffect, useState, useCallback } from "react";
import {
  Bell, AlertTriangle, AlertCircle, Info, CheckCircle2, X, Filter,
  Search, Clock, ExternalLink, Trash2, Archive, RefreshCw,
  ChevronDown, ChevronRight, MoreHorizontal, ShieldAlert, ServerCrash, BrainCircuit
} from "lucide-react";

const API = '/api';

type AlertSeverity = "critical" | "warning" | "info";
type AlertStatus = "open" | "acknowledged" | "resolved";

interface Alert {
  id: string; title: string; message: string;
  severity: AlertSeverity; status: AlertStatus;
  source: string; createdAt: string; resolvedAt?: string;
  acknowledgedBy?: string; tags: string[]; relatedEntity?: string;
}

const severityConfig = {
  critical: { icon: <ShieldAlert className="w-4 h-4" />, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", badge: "bg-red-500/20 text-red-300" },
  warning: { icon: <AlertTriangle className="w-4 h-4" />, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", badge: "bg-amber-500/20 text-amber-300" },
  info: { icon: <Info className="w-4 h-4" />, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", badge: "bg-blue-500/20 text-blue-300" },
};

const statusConfig = {
  open: { label: "Open", icon: <AlertCircle className="w-3 h-3" />, color: "text-red-400" },
  acknowledged: { label: "Ack'd", icon: <Clock className="w-3 h-3" />, color: "text-amber-400" },
  resolved: { label: "Resolved", icon: <CheckCircle2 className="w-3 h-3" />, color: "text-emerald-400" },
};

const sourceIcon = (source: string) => {
  if (source.includes("control-plane")) return <ServerCrash className="w-4 h-4" />;
  if (source.includes("mythos")) return <ShieldAlert className="w-4 h-4" />;
  if (source.includes("agent")) return <BrainCircuit className="w-4 h-4" />;
  return <Bell className="w-4 h-4" />;
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "all">("all");
  const [statusFilter, setStatusFilter] = useState<AlertStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ─── Fetch alerts from API ───────────────────────────
  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API}/alerts`);
      if (!res.ok) {
        // Fallback: try events endpoint and filter for alert-like events
        const eventsRes = await fetch(`${API}/events`);
        if (!eventsRes.ok) throw new Error(`HTTP ${res.status}`);
        const eventsData = await eventsRes.json();
        const events = eventsData.events || eventsData || [];
        // Transform events that look like alerts
        const transformed: Alert[] = events
          .filter((e: any) => e.type?.includes('alert') || e.type?.includes('error') || e.type?.includes('failed'))
          .map((e: any, i: number) => ({
            id: e.id || `alt-${i}`,
            title: e.type || 'System Alert',
            message: e.data_json ? JSON.stringify(e.data_json).slice(0, 200) : 'No details',
            severity: (e.type?.includes('error') || e.type?.includes('failed')) ? 'critical' as const : 'warning' as const,
            status: 'open' as const,
            source: e.type || 'system',
            createdAt: e.timestamp || new Date().toISOString(),
            tags: [e.type || 'alert'],
          }));
        setAlerts(transformed);
        return;
      }
      const data = await res.json();
      setAlerts(data.alerts || data || []);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  const handleStatusChange = useCallback(async (id: string, newStatus: AlertStatus) => {
    try {
      const res = await fetch(`${API}/alerts/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Optimistic update
      setAlerts(prev => prev.map(a => {
        if (a.id !== id) return a;
        const updated: Alert = { ...a, status: newStatus };
        if (newStatus === "resolved") updated.resolvedAt = new Date().toISOString();
        if (newStatus === "acknowledged") updated.acknowledgedBy = "current-user";
        return updated;
      }));
    } catch (err) {
      console.error('Failed to update alert status:', err);
      alert(`Failed to update alert: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, []);

  const handleBulkAction = useCallback(async (action: "acknowledge" | "resolve") => {
    try {
      const updates = Array.from(selected).map(id =>
        fetch(`${API}/alerts/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: action === "acknowledge" ? "acknowledged" : "resolved" }),
        })
      );
      await Promise.all(updates);
      fetchAlerts();
      setSelected(new Set());
    } catch (err) {
      console.error('Bulk action failed:', err);
    }
  }, [selected, fetchAlerts]);

  const filtered = alerts.filter(a => {
    const matchesSeverity = severityFilter === "all" || a.severity === severityFilter;
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    const matchesSearch = search === "" ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.message.toLowerCase().includes(search.toLowerCase()) ||
      a.source.toLowerCase().includes(search.toLowerCase()) ||
      a.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchesSeverity && matchesStatus && matchesSearch;
  });

  const counts = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === "critical" && a.status !== "resolved").length,
    warning: alerts.filter(a => a.severity === "warning" && a.status !== "resolved").length,
    open: alerts.filter(a => a.status === "open").length,
  };

  const allSelected = filtered.length > 0 && filtered.every(a => selected.has(a.id));

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-indigo-400" /> Alerts
            {counts.open > 0 && <span className="px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded-full border border-red-500/30">{counts.open} open</span>}
          </h1>
          <p className="text-slate-400 text-sm mt-1">Monitor and manage system alerts across all Agent-OS components</p>
        </div>
        <button onClick={fetchAlerts} className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300 hover:border-slate-700 transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => { setSeverityFilter("critical"); setStatusFilter("all"); }}
          className={`p-4 rounded-xl border text-left transition-all ${severityFilter === "critical" ? "bg-red-950/30 border-red-500/40 ring-1 ring-red-500/20" : "bg-slate-900/50 border-slate-800 hover:border-slate-700"}`}>
          <div className="flex items-center gap-2 text-red-400 mb-1"><ShieldAlert className="w-4 h-4" /><span className="text-sm font-medium">Critical</span></div>
          <div className="text-2xl font-bold text-white">{counts.critical}</div><div className="text-xs text-slate-500">unresolved</div>
        </button>
        <button onClick={() => { setSeverityFilter("warning"); setStatusFilter("all"); }}
          className={`p-4 rounded-xl border text-left transition-all ${severityFilter === "warning" ? "bg-amber-950/30 border-amber-500/40 ring-1 ring-amber-500/20" : "bg-slate-900/50 border-slate-800 hover:border-slate-700"}`}>
          <div className="flex items-center gap-2 text-amber-400 mb-1"><AlertTriangle className="w-4 h-4" /><span className="text-sm font-medium">Warning</span></div>
          <div className="text-2xl font-bold text-white">{counts.warning}</div><div className="text-xs text-slate-500">unresolved</div>
        </button>
        <button onClick={() => { setSeverityFilter("all"); setStatusFilter("all"); }}
          className={`p-4 rounded-xl border text-left transition-all ${severityFilter === "all" && statusFilter === "all" ? "bg-slate-800 border-indigo-500/40 ring-1 ring-indigo-500/20" : "bg-slate-900/50 border-slate-800 hover:border-slate-700"}`}>
          <div className="flex items-center gap-2 text-slate-400 mb-1"><Bell className="w-4 h-4" /><span className="text-sm font-medium">Total</span></div>
          <div className="text-2xl font-bold text-white">{counts.total}</div><div className="text-xs text-slate-500">all alerts</div>
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input type="text" placeholder="Search alerts..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as AlertStatus | "all")}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50">
          <option value="all">All Status</option><option value="open">Open</option><option value="acknowledged">Acknowledged</option><option value="resolved">Resolved</option>
        </select>
        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-400">{selected.size} selected</span>
            <button onClick={() => handleBulkAction("acknowledge")} className="px-3 py-1.5 text-xs bg-amber-600/20 text-amber-300 border border-amber-600/30 rounded-lg hover:bg-amber-600/30 transition-colors">Acknowledge</button>
            <button onClick={() => handleBulkAction("resolve")} className="px-3 py-1.5 text-xs bg-emerald-600/20 text-emerald-300 border border-emerald-600/30 rounded-lg hover:bg-emerald-600/30 transition-colors">Resolve</button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-amber-950/30 border border-amber-900/50 rounded-xl text-amber-300 text-sm">
          <AlertTriangle className="w-4 h-4 inline mr-2" />{error} (showing events as fallback)
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-500"><RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading alerts...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500"><CheckCircle2 className="w-12 h-12 mb-3 opacity-30" /><p>No alerts match your criteria</p></div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-3 px-4 py-2">
            <input type="checkbox" checked={allSelected} onChange={() => { if (allSelected) setSelected(new Set()); else setSelected(new Set(filtered.map(a => a.id))); }}
              className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-indigo-600 focus:ring-indigo-500/30" />
            <span className="text-xs text-slate-500 uppercase tracking-wider">Select all</span>
          </div>
          {filtered.map(alert => {
            const sev = severityConfig[alert.severity];
            const stat = statusConfig[alert.status];
            const isExpanded = expanded.has(alert.id);
            const isSelected = selected.has(alert.id);
            return (
              <div key={alert.id} className={`bg-slate-900/80 border rounded-xl overflow-hidden transition-all ${alert.status === "open" ? `${sev.border} ${sev.bg}` : "border-slate-800"}`}>
                <div className="p-4 flex items-start gap-3">
                  <input type="checkbox" checked={isSelected} onChange={() => { setSelected(prev => { const next = new Set(prev); if (next.has(alert.id)) next.delete(alert.id); else next.add(alert.id); return next; }); }}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-indigo-600 focus:ring-indigo-500/30 mt-0.5" />
                  <div className={`mt-0.5 ${sev.color}`}>{sev.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">{alert.title}</span>
                      <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase rounded ${sev.badge}`}>{alert.severity}</span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border ${alert.status === "open" ? "bg-red-500/10 text-red-300 border-red-500/20" : alert.status === "acknowledged" ? "bg-amber-500/10 text-amber-300 border-amber-500/20" : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"}`}>
                        {stat.icon}{stat.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1 line-clamp-2">{alert.message}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">{sourceIcon(alert.source)}{alert.source}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(alert.createdAt)}</span>
                      {alert.acknowledgedBy && <span className="text-amber-400">ack'd by {alert.acknowledgedBy}</span>}
                      {alert.relatedEntity && <span className="font-mono text-indigo-400">{alert.relatedEntity}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {alert.status === "open" && (
                      <button onClick={() => handleStatusChange(alert.id, "acknowledged")} className="p-2 hover:bg-amber-500/10 text-amber-400 rounded-lg transition-colors" title="Acknowledge"><Clock className="w-4 h-4" /></button>
                    )}
                    {alert.status !== "resolved" && (
                      <button onClick={() => handleStatusChange(alert.id, "resolved")} className="p-2 hover:bg-emerald-500/10 text-emerald-400 rounded-lg transition-colors" title="Resolve"><CheckCircle2 className="w-4 h-4" /></button>
                    )}
                    <button onClick={() => toggleExpand(alert.id)} className="p-2 hover:bg-slate-800 text-slate-400 rounded-lg transition-colors">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-800/50 pt-3 ml-12">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Full Message</div>
                        <p className="text-slate-300">{alert.message}</p>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Metadata</div>
                        <div className="space-y-1 text-slate-400 font-mono text-xs">
                          <div>ID: {alert.id}</div>
                          <div>Created: {new Date(alert.createdAt).toLocaleString()}</div>
                          {alert.resolvedAt && <div>Resolved: {new Date(alert.resolvedAt).toLocaleString()}</div>}
                          {alert.acknowledgedBy && <div>Acknowledged by: {alert.acknowledgedBy}</div>}
                          <div>Tags: {alert.tags.join(", ")}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <button className="flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors">
                        <ExternalLink className="w-3 h-3" /> View in Logs
                      </button>
                      {alert.relatedEntity && (
                        <button className="flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-800 text-indigo-300 rounded-lg hover:bg-slate-700 transition-colors">
                          <BrainCircuit className="w-3 h-3" /> Inspect {alert.relatedEntity}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}