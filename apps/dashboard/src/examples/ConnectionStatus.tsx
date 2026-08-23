import { useHealth } from '../hooks/useApi';

/**
 * ConnectionStatus — Shows backend version and health
 * Usage: <ConnectionStatus />
 */
export function ConnectionStatus() {
  const { data: health, isLoading, error } = useHealth();

  if (isLoading) return <span className="text-gray-400">Connecting...</span>;
  if (error) return <span className="text-red-500">❌ Backend offline</span>;

  return (
    <span className="text-green-600">
      ✅ v{health?.version} • {health?.db?.split('/').pop()}
    </span>
  );
}
