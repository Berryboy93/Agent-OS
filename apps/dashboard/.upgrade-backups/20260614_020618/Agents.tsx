import React, { useState, useEffect } from 'react';
import { ChevronDown, Play, Pause, RotateCcw, Trash2 } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  description: string;
  version: string;
  created_at: number;
  updated_at: number;
}

export function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(data => {
        setAgents(Array.isArray(data) ? data : data.agents || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch agents:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Loading agents...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
      <div className="page-header entry-animate">
        <h1>Agents</h1>
        <p>Manage your agent fleet — {agents.length} agent{agents.length !== 1 ? 's' : ''} deployed</p>
      </div>
      <div className="glass-lg entry-animate" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{agents.length} agents</span>
        </div>
        <div style={{ overflow: 'auto', flex: 1 }}>
          <table className="table-glass">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Version</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent, i) => (
                <tr key={agent.id} className="entry-animate" style={{ animationDelay: `${i * 0.03}s` }}>
                  <td><span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>{agent.name}</span></td>
                  <td><span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{agent.description}</span></td>
                  <td><span className="font-mono" style={{ color: 'var(--purple)', fontSize: 12 }}>{agent.version}</span></td>
                  <td><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{new Date(agent.created_at).toLocaleDateString()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
