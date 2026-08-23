import { useEffect, useState, useCallback } from "react";
import {
  Play, Pause, RotateCcw, Trash2, Plus, ChevronDown, ChevronRight,
  Activity, Clock, CheckCircle2, XCircle, AlertTriangle, Filter,
  Search, MoreHorizontal, GitBranch, Layers
} from "lucide-react";

const API = '/api';

interface PipelineStage {
  id: string; name: string; status: "idle" | "running" | "success" | "failed" | "skipped";
  durationMs?: number; logs?: string[];
}

interface Pipeline {
  id: string; name: string; description: string;
  status: "idle" | "running" | "success" | "failed";
  trigger: "manual" | "scheduled" | "webhook";
  lastRunAt?: string; nextRunAt?: string;
  stages: PipelineStage[]; tags: string[];
}

const statusIcon = (status: Pipeline["status"]) => {
  switch (status) {
    case "running": return <Activity className="w-4 h-4 text-blue-400 animate-pulse" />;
    case "success": return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case "failed": return <XCircle className="w-4 h-4 text-red-400" />;
    default: return <Clock className="w-4 h-4 text-slate-400" />;
  }
};

const stageStatusColor = (status: PipelineStage["status"]) => {
  switch (status) {
    case "success": return "bg-emerald-500/20 border-emerald-500/40 text-emerald-300";
    case "failed": return "bg-red-500/20 border-red-500/40 text-red-300";
    case "running": return "bg-blue-500/20 border-blue-500/40 text-blue-300 animate-pulse";
    case "skipped": return "bg-slate-500/20 border-slate-500/40 text-slate-400 line-through";
    default: return "bg-slate-800/50 border-slate-700 text-slate-500";
  }
};

const formatDuration = (ms?: number) => {
  if (!ms) return "—";
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = ((ms % 60000) / 1000).toFixed(0);
  return `${m}m ${s}s`;
};

const formatTime = (iso?: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
};

function StageBar({ stages }: { stages: PipelineStage[] }) {
  return (
    <div className="flex items-center gap-1 mt-3">
      {stages.map((stage, i) => (
        <div key={stage.id} className="flex items-center gap-1 flex-1">
          <div className={`h-2 flex-1 rounded-full border transition-all duration-500 ${stageStatusColor(stage.status)}`} title={`${stage.name}: ${stage.status}`} />
          {i < stages.length - 1 && <ChevronRight className="w-3 h-3 text-slate-600" />}
        </div>
      ))}
    </div>
  );
}

function StageDetail({ stages }: { stages: PipelineStage[] }) {
  return (
    <div className="mt-3 ml-4 space-y-2 border-l-2 border-slate-700 pl-4">
      {stages.map((stage) => (
        <div key={stage.id} className="flex items-start gap-3 text-sm">
          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
            stage.status === "success" ? "bg-emerald-400" :
            stage.status === "failed" ? "bg-red-400" :
            stage.status === "running" ? "bg-blue-400 animate-pulse" :
            stage.status === "skipped" ? "bg-slate-500" : "bg-slate-700"
          }`} />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className={stage.status === "skipped" ? "text-slate-500 line-through" : "text-slate-200"}>{stage.name}</span>
              <span className="text-xs text-slate-500 font-mono">{formatDuration(stage.durationMs)}</span>
            </div>
            {stage.logs && stage.logs.length > 0 && (
              <div className="mt-1 p-2 bg-red-950/30 border border-red-900/50 rounded text-xs text-red-300 font-mono">
                {stage.logs.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PipelinesPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "running" | "success" | "failed" | "idle">("all");
  const [search, setSearch] = useState("");

  // ─── Fetch pipelines from API ─────────────────────────
  const fetchPipelines = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API}/pipelines`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Backend may return { pipelines: [...] } or just [...]
      const list = data.pipelines || data || [];
      setPipelines(list);
    } catch (err) {
      console.error('Failed to fetch pipelines:', err);
      setError(err instanceof Error ? err.message : 'Failed to load pipelines');
      // Fallback: empty list so UI doesn't break
      setPipelines([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPipelines();
    // Auto-refresh every 10s
    const interval = setInterval(fetchPipelines, 10000);
    return () => clearInterval(interval);
  }, [fetchPipelines]);

  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleAction = useCallback(async (id: string, action: "run" | "pause" | "retry" | "delete") => {
    try {
      if (action === "delete") {
        const res = await fetch(`${API}/pipelines/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setPipelines(prev => prev.filter(p => p.id !== id));
      } else if (action === "run") {
        const res = await fetch(`${API}/pipelines/${id}/run`, { method: 'POST' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        fetchPipelines(); // refresh
      } else if (action === "pause") {
        const res = await fetch(`${API}/pipelines/${id}/pause`, { method: 'POST' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        fetchPipelines();
      } else if (action === "retry") {
        const res = await fetch(`${API}/pipelines/${id}/retry`, { method: 'POST' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        fetchPipelines();
      }
    } catch (err) {
      console.error(`Pipeline ${action} failed:`, err);
      alert(`Failed to ${action} pipeline: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [fetchPipelines]);

  const filtered = pipelines.filter(p => {
    const matchesFilter = filter === "all" || p.status === filter;
    const matchesSearch = search === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const counts = {
    all: pipelines.length,
    running: pipelines.filter(p => p.status === "running").length,
    success: pipelines.filter(p => p.status === "success").length,
    failed: pipelines.filter(p => p.status === "failed").length,
    idle: pipelines.filter(p => p.status === "idle").length,
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-indigo-400" /> Pipelines
          </h1>
          <p className="text-slate-400 text-sm mt-1">Orchestrate, monitor, and debug your Agent-OS pipelines</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Pipeline
        </button>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {(["all", "running", "success", "failed", "idle"] as const).map(key => (
          <button key={key} onClick={() => setFilter(key)}
            className={`p-3 rounded-xl border text-left transition-all ${filter === key ? "bg-slate-800 border-indigo-500/50 ring-1 ring-indigo-500/30" : "bg-slate-900/50 border-slate-800 hover:border-slate-700"}`}>
            <div className="text-2xl font-bold text-white">{counts[key]}</div>
            <div className="text-xs text-slate-400 capitalize">{key}</div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input type="text" placeholder="Search pipelines, tags, descriptions..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30" />
        </div>
        <button className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300 hover:border-slate-700 transition-colors">
          <Filter className="w-4 h-4" /> Filter
        </button>
        <button onClick={fetchPipelines} className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300 hover:border-slate-700 transition-colors">
          <Activity className="w-4 h-4" /> Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-xl text-red-300 text-sm">
          <AlertTriangle className="w-4 h-4 inline mr-2" />{error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-500">
          <Activity className="w-5 h-5 animate-spin mr-2" /> Loading pipelines...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          <Layers className="w-12 h-12 mb-3 opacity-30" />
          <p>No pipelines match your criteria</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(pipeline => (
            <div key={pipeline.id} className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors">
              <div className="p-4 flex items-center gap-4">
                <button onClick={() => toggleExpand(pipeline.id)} className="text-slate-500 hover:text-slate-300 transition-colors">
                  {expanded.has(pipeline.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {statusIcon(pipeline.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white truncate">{pipeline.name}</span>
                    <span className="text-xs font-mono text-slate-500">{pipeline.id}</span>
                  </div>
                  <p className="text-sm text-slate-400 truncate">{pipeline.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {pipeline.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded-full border border-slate-700">{tag}</span>
                  ))}
                </div>
                <div className="hidden md:flex items-center gap-4 text-xs text-slate-500 min-w-[200px]">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(pipeline.lastRunAt)}</span>
                  {pipeline.trigger === "scheduled" && pipeline.nextRunAt && (
                    <span className="flex items-center gap-1 text-indigo-400"><AlertTriangle className="w-3 h-3" />{formatTime(pipeline.nextRunAt)}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {pipeline.status === "idle" && (
                    <button onClick={() => handleAction(pipeline.id, "run")} className="p-2 hover:bg-emerald-500/10 text-emerald-400 rounded-lg transition-colors" title="Run"><Play className="w-4 h-4" /></button>
                  )}
                  {pipeline.status === "running" && (
                    <button onClick={() => handleAction(pipeline.id, "pause")} className="p-2 hover:bg-amber-500/10 text-amber-400 rounded-lg transition-colors" title="Pause"><Pause className="w-4 h-4" /></button>
                  )}
                  {pipeline.status === "failed" && (
                    <button onClick={() => handleAction(pipeline.id, "retry")} className="p-2 hover:bg-blue-500/10 text-blue-400 rounded-lg transition-colors" title="Retry"><RotateCcw className="w-4 h-4" /></button>
                  )}
                  <button onClick={() => handleAction(pipeline.id, "delete")} className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  <button className="p-2 hover:bg-slate-800 text-slate-400 rounded-lg transition-colors"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="px-4 pb-3"><StageBar stages={pipeline.stages} /></div>
              {expanded.has(pipeline.id) && (
                <div className="px-4 pb-4 border-t border-slate-800 pt-3">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Stage Details</div>
                  <StageDetail stages={pipeline.stages} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}