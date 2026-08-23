import { useState, useEffect } from 'react'
import { Panel } from '../components/ui/Panel'
import { Stat } from '../components/ui/Stat'
import { Activity, Zap, MessageSquare, Bot } from 'lucide-react'
import { useErrorPrediction } from '../hooks/useErrorPrediction'
import { PredictionPanel } from '../components/ui/PredictionPanel'
import { CircuitBreakerStatus } from '../components/ui/CircuitBreakerStatus'

export default function Overview() {
  const [stats, setStats] = useState<any>(null)
  const [runs, setRuns] = useState<any[]>([])
  const { patterns, recentErrors, loading: errorLoading, severityCount } = useErrorPrediction('http://localhost:5001', 5000)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, runsRes] = await Promise.all([
          fetch('http://localhost:5001/api/stats'),
          fetch('http://localhost:5001/api/runs')
        ])
        if (statsRes.ok) setStats(await statsRes.json())
        if (runsRes.ok) setRuns(await runsRes.json())
      } catch (err) {
        console.error('Fetch error:', err)
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <Panel>
          <Stat label="System Status" value="Healthy" icon={<Activity size={24} />} />
        </Panel>
        <Panel>
          <Stat label="Total Runs" value={String(stats?.total_runs ?? 0)} subtext={`${stats?.success_rate ?? 0}% success`} icon={<Zap size={24} />} />
        </Panel>
        <Panel>
          <Stat label="Pending Approvals" value={String(stats?.pending_approvals ?? 0)} icon={<MessageSquare size={24} />} />
        </Panel>
        <Panel>
          <Stat label="Active Pipelines" value={String(stats?.active_pipelines ?? 0)} icon={<Bot size={24} />} />
        </Panel>
      </div>

      {/* Error Predictor Status */}
      {patterns && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Panel>
            <CircuitBreakerStatus state={patterns.circuitBreakerState} />
          </Panel>
          <Panel>
            <div className="text-center">
              <p className="text-sm text-gray-500">CRITICAL</p>
              <p className="text-3xl font-bold text-red-600">{severityCount.critical}</p>
            </div>
          </Panel>
          <Panel>
            <div className="text-center">
              <p className="text-sm text-gray-500">WARNING</p>
              <p className="text-3xl font-bold text-yellow-600">{severityCount.warning}</p>
            </div>
          </Panel>
          <Panel>
            <div className="text-center">
              <p className="text-sm text-gray-500">INFO</p>
              <p className="text-3xl font-bold text-blue-600">{severityCount.info}</p>
            </div>
          </Panel>
        </div>
      )}

      {/* Prediction Panel */}
      {patterns && (
        <Panel title="Error Patterns">
          <PredictionPanel patterns={patterns.patterns} loading={errorLoading} error={null} />
        </Panel>
      )}

      {/* Recent Runs */}
      <Panel title="Recent Runs">
        {runs.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {runs.slice(0, 10).map((run: any) => (
              <div key={run.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{run.name}</div>
                  <div className="text-sm text-gray-500">Agent: {run.agent}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${run.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {run.status}
                  </span>
                  <span className="text-sm text-gray-500">{run.duration_ms}ms</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">No runs yet</div>
        )}
      </Panel>
    </div>
  )
}
