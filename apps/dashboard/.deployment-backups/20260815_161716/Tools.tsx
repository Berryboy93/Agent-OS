import { useState, useMemo } from 'react';
import {
  Wrench, Play, Square, Trash2, Edit2, Plus,
  Search, Filter, Activity, Clock, AlertCircle,
  CheckCircle2, XCircle, Zap, Server, Box,
  Layers, RefreshCw, ChevronDown, Terminal,
  Settings2, Eye, History, BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTools, useToolStats, useToolExecutions, useExecuteTool, useDeleteTool } from '../hooks/useTools';
import { useToolExecutionsSSE } from '../hooks/useToolExecutionsSSE';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Badge } from '../components/ui/Badge';
import { MetricCard } from '../components/metrics/MetricCard';
import { MetricGrid } from '../components/metrics/MetricGrid';
import type { Tool, ToolExecution, ToolFilter } from '../types/tools';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  agent: Zap,
  system: Server,
  utility: Wrench,
  integration: Layers,
};

const STATUS_CONFIG = {
  active: { color: 'emerald', icon: CheckCircle2, label: 'Active' },
  deprecated: { color: 'amber', icon: AlertCircle, label: 'Deprecated' },
  experimental: { color: 'violet', icon: Box, label: 'Experimental' },
  error: { color: 'rose', icon: XCircle, label: 'Error' },
};

const EXECUTION_STATUS_CONFIG = {
  pending: { color: 'amber', icon: Clock },
  running: { color: 'blue', icon: Activity },
  completed: { color: 'emerald', icon: CheckCircle2 },
  failed: { color: 'rose', icon: XCircle },
  cancelled: { color: 'slate', icon: Square },
};

export function ToolsPage() {
  const [filter, setFilter] = useState<ToolFilter>({});
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'registry' | 'executions' | 'stats'>('registry');

  const { data: tools = [], isLoading: toolsLoading } = useTools(filter);
  const { data: stats } = useToolStats();
  const { data: executions = [] } = useToolExecutions(selectedTool?.id);
  const { liveExecutions, isConnected: sseConnected } = useToolExecutionsSSE(selectedTool?.id);

  const executeMutation = useExecuteTool();
  const deleteMutation = useDeleteTool();

  const allExecutions = useMemo(() => {
    const liveMap = new Map(liveExecutions.map(e => [e.id, e]));
    const merged = [...executions];
    liveMap.forEach((live, id) => {
      const idx = merged.findIndex(e => e.id === id);
      if (idx >= 0) merged[idx] = live;
      else merged.unshift(live);
    });
    return merged.slice(0, 50);
  }, [executions, liveExecutions]);

  const handleExecute = async (tool: Tool, parameters: Record<string, unknown>) => {
    await executeMutation.mutateAsync({ id: tool.id, parameters });
    setShowExecuteModal(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tool? This action cannot be undone.')) return;
    await deleteMutation.mutateAsync(id);
  };

  const categories = useMemo(() =>
    [...new Set(tools.map(t => t.category))],
    [tools]
  );

  const tags = useMemo(() =>
    [...new Set(tools.flatMap(t => t.tags))].slice(0, 20),
    [tools]
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Wrench className="w-8 h-8 text-cyan-400" />
            Tool Registry
          </h1>
          <p className="text-slate-400 mt-1">
            Manage, execute, and monitor Agent-OS tools
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            <span className="text-xs text-slate-300">
              {sseConnected ? 'Live' : 'Offline'}
            </span>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Tool
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <MetricGrid columns={4}>
          <MetricCard
            title="Total Tools"
            value={stats.totalTools}
            icon={<Box className="w-5 h-5" />}
            trend={stats.activeTools}
            trendLabel="active"
          />
          <MetricCard
            title="Total Executions"
            value={stats.totalExecutions.toLocaleString()}
            icon={<Play className="w-5 h-5" />}
            trend={Math.round(stats.successRate * 100)}
            trendLabel="success rate"
            trendUp={stats.successRate > 0.95}
          />
          <MetricCard
            title="Avg Latency"
            value={`${Math.round(stats.avgLatency)}ms`}
            icon={<Clock className="w-5 h-5" />}
            trend={-12}
            trendLabel="vs last hour"
            trendUp={false}
          />
          <MetricCard
            title="Top Tool"
            value={stats.topTools[0]?.name || 'N/A'}
            icon={<Zap className="w-5 h-5" />}
            trend={stats.topTools[0]?.count || 0}
            trendLabel="executions"
          />
        </MetricGrid>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-lg w-fit border border-slate-700">
        {(['registry', 'executions', 'stats'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab === 'registry' && <span className="flex items-center gap-2"><Box className="w-4 h-4" /> Registry</span>}
            {tab === 'executions' && <span className="flex items-center gap-2"><History className="w-4 h-4" /> Executions</span>}
            {tab === 'stats' && <span className="flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Analytics</span>}
          </button>
        ))}
      </div>

      {/* Registry Tab */}
      {activeTab === 'registry' && (
        <div className="space-y-4">
          {/* Filters */}
          <GlassPanel className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[300px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search tools..."
                  value={filter.search || ''}
                  onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <select
                  value={filter.category || ''}
                  onChange={e => setFilter(f => ({ ...f, category: e.target.value || undefined }))}
                  className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="">All Categories</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={filter.status || ''}
                  onChange={e => setFilter(f => ({ ...f, status: e.target.value || undefined }))}
                  className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="">All Statuses</option>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>

              {tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {tags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setFilter(f => ({
                        ...f,
                        tags: f.tags?.includes(tag)
                          ? f.tags.filter(t => t !== tag)
                          : [...(f.tags || []), tag]
                      }))}
                      className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                        filter.tags?.includes(tag)
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </GlassPanel>

          {/* Tools Grid */}
          {toolsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-slate-800/30 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {tools.map(tool => {
                  const StatusIcon = STATUS_CONFIG[tool.status].icon;
                  const CategoryIcon = CATEGORY_ICONS[tool.category] || Wrench;

                  return (
                    <motion.div
                      key={tool.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group relative"
                    >
                      <GlassPanel as="div" onClick={() => setSelectedTool(tool)}>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                              <CategoryIcon className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                                {tool.name}
                              </h3>
                              <p className="text-xs text-slate-500">v{tool.version}</p>
                            </div>
                          </div>
                          <Badge
                            variant={STATUS_CONFIG[tool.status].color as any}
                            className="flex items-center gap-1"
                          >
                            <StatusIcon className="w-3 h-3" />
                            {STATUS_CONFIG[tool.status].label}
                          </Badge>
                        </div>

                        <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                          {tool.description}
                        </p>

                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                          {tool.tags.map((tag: string) => (
                            <span key={tag} className="px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-400">
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center p-2 bg-slate-900/50 rounded-lg">
                            <div className="text-slate-500 mb-1">Executions</div>
                            <div className="font-mono text-white">{tool.executionCount.toLocaleString()}</div>
                          </div>
                          <div className="text-center p-2 bg-slate-900/50 rounded-lg">
                            <div className="text-slate-500 mb-1">Latency</div>
                            <div className="font-mono text-white">{Math.round(tool.avgLatency)}ms</div>
                          </div>
                          <div className="text-center p-2 bg-slate-900/50 rounded-lg">
                            <div className="text-slate-500 mb-1">Errors</div>
                            <div className={`font-mono ${tool.errorRate > 0.05 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {(tool.errorRate * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>

                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button
                            onClick={e => { e.stopPropagation(); handleExecute(tool, {}); }}
                            className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-md hover:bg-emerald-500/30"
                            title="Quick Execute"
                          >
                            <Play className="w-3 h-3" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setSelectedTool(tool); setShowExecuteModal(true); }}
                            className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-md hover:bg-cyan-500/30"
                            title="Execute with Parameters"
                          >
                            <Terminal className="w-3 h-3" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); }}
                            className="p-1.5 bg-amber-500/20 text-amber-400 rounded-md hover:bg-amber-500/30"
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(tool.id); }}
                            className="p-1.5 bg-rose-500/20 text-rose-400 rounded-md hover:bg-rose-500/30"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </GlassPanel>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Executions Tab */}
      {activeTab === 'executions' && (
        <GlassPanel className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-400" />
              Execution History
              {sseConnected && (
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedTool(null)}
                className={`px-3 py-1.5 rounded-lg text-sm ${!selectedTool ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
              >
                All Tools
              </button>
              {tools.slice(0, 5).map(tool => (
                <button
                  key={tool.id}
                  onClick={() => setSelectedTool(tool)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${selectedTool?.id === tool.id ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
                >
                  {tool.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {allExecutions.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Terminal className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No executions yet</p>
              </div>
            ) : (
              allExecutions.map(exec => {
                const statusConfig = EXECUTION_STATUS_CONFIG[exec.status];
                const StatusIcon = statusConfig.icon;

                return (
                  <motion.div
                    key={exec.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4 p-4 bg-slate-900/30 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <div className={`p-2 rounded-lg bg-${statusConfig.color}-500/10`}>
                      <StatusIcon className={`w-4 h-4 text-${statusConfig.color}-400`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{exec.toolName}</span>
                        <span className="text-xs text-slate-500 font-mono">{exec.correlationId.slice(0, 8)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(exec.startedAt).toLocaleString()}
                        </span>
                        {exec.duration > 0 && (
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {exec.duration}ms
                          </span>
                        )}
                        <span>by {exec.triggeredBy}</span>
                      </div>
                    </div>

                    {exec.status === 'running' && (
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400 animate-pulse rounded-full" style={{ width: '60%' }} />
                        </div>
                      </div>
                    )}

                    {exec.error && (
                      <div className="max-w-xs truncate text-xs text-rose-400 bg-rose-500/10 px-2 py-1 rounded">
                        {exec.error}
                      </div>
                    )}

                    <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                      <Eye className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })
            )}
          </div>
        </GlassPanel>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassPanel className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Daily Executions
            </h3>
            <div className="space-y-3">
              {stats.executionsByDay.map(day => (
                <div key={day.date} className="flex items-center gap-4">
                  <span className="text-xs text-slate-500 w-24">{day.date}</span>
                  <div className="flex-1 h-6 bg-slate-800 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-cyan-500/50 rounded-full"
                      style={{ width: `${Math.min((day.count / Math.max(...stats.executionsByDay.map(d => d.count))) * 100, 100)}%` }}
                    />
                    <div
                      className="absolute top-0 right-0 h-full bg-rose-500/50 rounded-r-full"
                      style={{ width: `${Math.min(((day.errors ?? 0) / day.count) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-white w-12 text-right">{day.count}</span>
                </div>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              Top Tools
            </h3>
            <div className="space-y-3">
              {stats.topTools.map((tool, i) => (
                <div key={tool.toolId} className="flex items-center gap-4 p-3 bg-slate-900/30 rounded-lg">
                  <span className="text-lg font-bold text-slate-600 w-6">#{i + 1}</span>
                  <div className="flex-1">
                    <div className="font-medium text-white">{tool.name}</div>
                    <div className="text-xs text-slate-500">{tool.count} executions</div>
                  </div>
                  <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full"
                      style={{ width: `${Math.min((tool.count / stats.topTools[0].count) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      )}

      {/* Execute Modal */}
      <AnimatePresence>
        {showExecuteModal && selectedTool && (
          <ExecuteModal
            tool={selectedTool}
            onExecute={handleExecute}
            onClose={() => setShowExecuteModal(false)}
            isLoading={executeMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ExecuteModal({ tool, onExecute, onClose, isLoading }: {
  tool: Tool;
  onExecute: (tool: Tool, params: Record<string, unknown>) => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const [params, setParams] = useState<Record<string, unknown>>({});

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            Execute: {tool.name}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          {tool.parameters?.map(param => (
            <div key={param.name}>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {param.name}
                {param.required && <span className="text-rose-400 ml-1">*</span>}
              </label>
              {param.enum ? (
                <select
                  value={String(params[param.name] ?? '')}
                  onChange={e => setParams(p => ({ ...p, [param.name]: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="">Select...</option>
                  {param.enum.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : param.type === 'boolean' ? (
                <button
                  onClick={() => setParams(p => ({ ...p, [param.name]: !params[param.name] }))}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    params[param.name]
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {params[param.name] ? 'True' : 'False'}
                </button>
              ) : (
                <input
                  type={param.type === 'number' ? 'number' : 'text'}
                  value={String(params[param.name] ?? param.defaultValue ?? '')}
                  onChange={e => setParams(p => ({
                    ...p,
                    [param.name]: param.type === 'number' ? Number(e.target.value) : e.target.value
                  }))}
                  placeholder={param.description}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              )}
              <p className="text-xs text-slate-500 mt-1">{param.description}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onExecute(tool, params)}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-900 font-semibold rounded-lg transition-colors"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Execute
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default ToolsPage;
