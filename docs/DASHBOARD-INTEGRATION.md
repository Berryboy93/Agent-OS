# ErrorPredictor Dashboard Integration Guide

## Files to Add/Modify

### 1. Copy Design Tokens
```bash
cp AGENT-OS-TOKENS.css ~/Agent-OS/apps/dashboard/src/styles/tokens.css
```

Then in `src/styles/globals.css`:
```css
@import './tokens.css';
```

### 2. Add Custom Hook
Place `useErrorPrediction.ts` at:
```
src/hooks/useErrorPrediction.ts
```

### 3. Add UI Components
Place these files:
```
src/components/ui/PredictionPanel.tsx
src/components/ui/CircuitBreakerStatus.tsx
```

### 4. Wire into Dashboard

Find your main dashboard or entry point (`src/pages/Dashboard.tsx` or `src/App.tsx`):

```tsx
import { useErrorPrediction } from '../hooks/useErrorPrediction';
import { PredictionPanel } from '../components/ui/PredictionPanel';
import { CircuitBreakerStatus } from '../components/ui/CircuitBreakerStatus';

export function Dashboard() {
  const { patterns, recentErrors, loading, error, severityCount } = useErrorPrediction(
    'http://localhost:5000',  // Agent-OS API base
    5000                       // poll every 5 seconds
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gutter-lg)' }}>
      {/* Page Header */}
      <div className="page-header entry-animate">
        <h1>Dashboard</h1>
        <p>System status and error predictions</p>
      </div>

      {/* Header Status Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--gutter-md)',
        }}
      >
        {/* Circuit Breaker (compact) */}
        {patterns && <CircuitBreakerStatus state={patterns.circuitBreakerState} compact={true} />}

        {/* Severity Counts */}
        <div className="glass-md p-[var(--gutter-md)] rounded-[var(--radius-lg)]">
          <p style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-muted)', margin: 0 }}>
            CRITICAL
          </p>
          <p
            style={{
              fontSize: 'var(--font-2xl)',
              fontWeight: 'bold',
              color: 'var(--color-error)',
              margin: 'var(--gutter-xs) 0 0 0',
            }}
          >
            {severityCount.critical}
          </p>
        </div>

        <div className="glass-md p-[var(--gutter-md)] rounded-[var(--radius-lg)]">
          <p style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-muted)', margin: 0 }}>
            WARNING
          </p>
          <p
            style={{
              fontSize: 'var(--font-2xl)',
              fontWeight: 'bold',
              color: 'var(--color-warning)',
              margin: 'var(--gutter-xs) 0 0 0',
            }}
          >
            {severityCount.warning}
          </p>
        </div>

        <div className="glass-md p-[var(--gutter-md)] rounded-[var(--radius-lg)]">
          <p style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-muted)', margin: 0 }}>
            INFO
          </p>
          <p
            style={{
              fontSize: 'var(--font-2xl)',
              fontWeight: 'bold',
              color: 'var(--color-info)',
              margin: 'var(--gutter-xs) 0 0 0',
            }}
          >
            {severityCount.info}
          </p>
        </div>
      </div>

      {/* Main Prediction Panel */}
      <div className="entry-animate">
        <h2 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--gutter-md)' }}>
          Active Error Patterns
        </h2>
        <PredictionPanel patterns={patterns} loading={loading} error={error} />
      </div>

      {/* Recent Errors List (Optional) */}
      {recentErrors.length > 0 && (
        <div className="entry-animate">
          <h2 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--gutter-md)' }}>
            Recent Errors
          </h2>
          <div
            className="glass-lg p-[var(--gutter-md)] rounded-[var(--radius-lg)]"
            style={{ maxHeight: '400px', overflow: 'auto' }}
          >
            {recentErrors.slice(0, 5).map((err, idx) => (
              <div
                key={idx}
                style={{
                  padding: 'var(--gutter-md)',
                  borderBottom: idx < 4 ? '1px solid var(--glass-200)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontSize: 'var(--font-sm)',
                        fontWeight: 500,
                        color: 'var(--color-text)',
                        margin: 0,
                      }}
                    >
                      {err.prediction.pattern}
                    </p>
                    <p
                      style={{
                        fontSize: 'var(--font-xs)',
                        color: 'var(--color-text-muted)',
                        margin: 'var(--gutter-xs) 0 0 0',
                      }}
                    >
                      {new Date(err.event.timestamp).toLocaleTimeString()} • {err.event.source}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 'var(--font-xs)',
                      fontWeight: 'bold',
                      color:
                        err.prediction.severity === 'critical'
                          ? 'var(--color-error)'
                          : err.prediction.severity === 'warning'
                            ? 'var(--color-warning)'
                            : 'var(--color-info)',
                    }}
                  >
                    {err.prediction.confidence}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

## Checklist

- [ ] Copy `useErrorPrediction.ts` to `src/hooks/`
- [ ] Copy `PredictionPanel.tsx` to `src/components/ui/`
- [ ] Copy `CircuitBreakerStatus.tsx` to `src/components/ui/`
- [ ] Copy `AGENT-OS-TOKENS.css` to `src/styles/`
- [ ] Import tokens in `src/styles/globals.css`
- [ ] Add imports to your Dashboard/App component
- [ ] Call `useErrorPrediction` hook in dashboard
- [ ] Render `<PredictionPanel>` and `<CircuitBreakerStatus>`
- [ ] Run `pnpm tsc --noEmit` (should be zero errors)
- [ ] Test in browser: http://localhost:5173 (or your Vite dev port)
- [ ] Verify API calls: Open DevTools Network tab
  - Should see `GET /api/errors/recent` every 5s
  - Should see `GET /api/errors/patterns` every 5-10s

## Expected Behavior

1. Dashboard loads → hook starts polling
2. Every 5 seconds → fetches `/api/errors/recent` and `/api/errors/patterns`
3. Real-time updates on screen:
   - CircuitBreakerStatus shows green/yellow/red
   - PredictionPanel displays active patterns
   - Severity counts update live
   - Recent errors list populated

## Troubleshooting

### API calls failing (404)
- Verify Agent-OS API server running on port 5000
- Check CORS headers (should be enabled)
- Check browser console for fetch errors

### Types not resolving
- Run `pnpm install` to ensure dependencies
- Check `tsconfig.json` for proper path mappings

### No data showing
- Check Network tab → verify API responses are valid JSON
- Verify ErrorPredictor service imported correctly in routes
- Check that errors are being reported (can manually POST to `/api/errors/report`)

### Performance (OOM)
- Reduce poll interval from 5000ms to 10000ms
- Reduce event window size in Observer class (currently 100)

---

**Integration time:** 10–15 minutes
**Validation:** All three repos running + hot reload working
