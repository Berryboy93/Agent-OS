import { useState, useEffect } from 'react'

interface ErrorEvent {
  event: { type: string; message: string; source: string; severity: string; timestamp: string }
  prediction: { pattern: string; confidence: number; severity: string }
}

export function useErrorPrediction(apiBase: string, refreshMs: number = 5000) {
  const [patterns, setPatterns] = useState<any>(null)
  const [recentErrors, setRecentErrors] = useState<ErrorEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [severityCount, setSeverityCount] = useState({ critical: 0, warning: 0, info: 0 })

  const refetch = async () => {
    try {
      setLoading(true)
      const patternsRes = await fetch(`${apiBase}/api/errors/patterns`)
      const recentRes = await fetch(`${apiBase}/api/errors/recent`)

      if (patternsRes.ok) {
        const data = await patternsRes.json()
        setPatterns(data)
        setSeverityCount(data.severityCount)
      }
      if (recentRes.ok) {
        const data = await recentRes.json()
        setRecentErrors(data.recent || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refetch()
    const interval = setInterval(refetch, refreshMs)
    return () => clearInterval(interval)
  }, [apiBase, refreshMs])

  return { patterns, recentErrors, loading, error, severityCount, refetch }
}
