import { ComponentType, useState, useCallback } from 'react'
import { ToolsPage } from './pages/Tools';
import { useHealthCheck, useRuns } from './hooks/useCommandCenter';
import { useEventStream } from './hooks/useEventStream';
import {
  LayoutDashboard, Play, Wrench, Bell, Zap, Settings,
  AlertCircle, CheckCircle2, X
} from 'lucide-react';

const API = '/api/command-center';

interface NavItem {
  id: string;
  label: string;
  icon: ComponentType;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'runs', label: 'Runs', icon: Play },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { data: healthData, isLoading: healthLoading } = useHealthCheck();
  const { data: runsData } = useRuns();
  const { isConnected: streamConnected } = useEventStream();

  const isHealthy = healthData?.status === 'ok';

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
        <div className="mb-8">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6" />
            Agent-OS
          </h1>
        </div>

        {/* Health Status */}
        <div className="mb-6 p-3 bg-gray-700 rounded-lg text-sm">
          <div className="flex items-center gap-2 mb-2">
            {isHealthy ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
            <span>Backend: {isHealthy ? 'Connected' : 'Disconnected'}</span>
          </div>
          {streamConnected && (
            <div className="text-xs text-gray-400">
              🔴 Events connected
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  currentPage === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Stats */}
        <div className="mt-8 pt-8 border-t border-gray-700">
          <div className="text-xs text-gray-400 mb-4">STATS</div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Active Runs</span>
              <span className="font-semibold">{runsData?.data?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Pending</span>
              <span className="font-semibold">
                {runsData?.data?.filter((r: any) => r.status === 'pending').length || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Page Header */}
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">
              {navItems.find((n) => n.id === currentPage)?.label}
            </h2>
            <div className="flex items-center gap-4">
              <button className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                Refresh
              </button>
            </div>
          </div>

          {/* Page Content */}
          <div className="space-y-6">
            {currentPage === 'dashboard' && (
              <DashboardPage runsData={runsData} />
            )}
            {currentPage === 'tools' && (
              <ToolsPage />
            )}
            {currentPage === 'runs' && (
              <RunsPage runsData={runsData} />
            )}
            {currentPage === 'alerts' && (
              <AlertsPage />
            )}
            {currentPage === 'settings' && (
              <SettingsPage />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardPage({ runsData }: any) {
  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="text-gray-400 text-sm mb-2">Total Runs</div>
        <div className="text-3xl font-bold">{runsData?.data?.length || 0}</div>
      </div>
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="text-gray-400 text-sm mb-2">Successful</div>
        <div className="text-3xl font-bold text-green-400">
          {runsData?.data?.filter((r: any) => r.status === 'completed').length || 0}
        </div>
      </div>
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="text-gray-400 text-sm mb-2">Pending</div>
        <div className="text-3xl font-bold text-yellow-400">
          {runsData?.data?.filter((r: any) => r.status === 'pending').length || 0}
        </div>
      </div>
    </div>
  );
}

function RunsPage({ runsData }: any) {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Recent Runs</h3>
      <div className="space-y-2">
        {runsData?.data?.slice(0, 10).map((run: any) => (
          <div key={run.id} className="flex justify-between items-center p-3 bg-gray-700 rounded">
            <div>
              <div className="font-semibold">{run.agent}</div>
              <div className="text-sm text-gray-400">{run.id}</div>
            </div>
            <span className={`px-3 py-1 rounded text-sm ${
              run.status === 'completed' ? 'bg-green-900 text-green-200' :
              run.status === 'pending' ? 'bg-yellow-900 text-yellow-200' :
              'bg-red-900 text-red-200'
            }`}>
              {run.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertsPage() {
  return (
    <div className="bg-gray-800 p-6 rounded-lg text-center text-gray-400">
      No active alerts
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Settings</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">API Base URL</label>
          <input
            type="text"
            value="/api/command-center"
            disabled
            className="w-full px-3 py-2 bg-gray-700 rounded text-gray-300"
          />
        </div>
      </div>
    </div>
  );
}
