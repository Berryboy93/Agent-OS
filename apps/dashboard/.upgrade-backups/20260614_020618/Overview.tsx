import { Panel } from '../components/ui/Panel'
import { Stat } from '../components/ui/Stat'
import { Activity, Zap, MessageSquare, Bot } from 'lucide-react'

export default function Overview() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <Panel>
          <Stat
            label="Status"
            value="Healthy"
            icon={<Activity size={24} />}
          />
        </Panel>

        <Panel>
          <Stat
            label="Total Runs"
            value="382"
            subtext="Last 24h"
            icon={<Zap size={24} />}
          />
        </Panel>

        <Panel>
          <Stat
            label="Events"
            value="1248"
            subtext="Last hour"
            icon={<MessageSquare size={24} />}
          />
        </Panel>

        <Panel>
          <Stat
            label="Active Agents"
            value="12"
            icon={<Bot size={24} />}
          />
        </Panel>
      </div>

      <Panel title="Recent Runs">
        <div className="text-center py-12 text-muted">
          No runs yet. Dashboard is ready for data.
        </div>
      </Panel>
    </div>
  )
}
