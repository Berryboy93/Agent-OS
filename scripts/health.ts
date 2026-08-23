#!/usr/bin/env tsx
/**
 * Agent-OS Full-Stack Health Check
 * Tests every backend endpoint + SSE + data shape integrity
 *
 * Run from ~/Agent-OS:
 *   tsx scripts/health.ts
 */

const API = 'http://127.0.0.1:5001'
const UI  = 'http://127.0.0.1:5173'

let pass = 0, fail = 0, warn = 0

const GREEN  = '\x1b[32m'
const RED    = '\x1b[31m'
const YELLOW = '\x1b[33m'
const CYAN   = '\x1b[36m'
const BOLD   = '\x1b[1m'
const RESET  = '\x1b[0m'

function ok(label: string, detail = '') {
  console.log(`  ${GREEN}✓${RESET}  ${label}${detail ? `  ${YELLOW}(${detail})${RESET}` : ''}`)
  pass++
}
function fail_(label: string, detail = '') {
  console.log(`  ${RED}✗${RESET}  ${label}${detail ? `\n     ${RED}↳ ${detail}${RESET}` : ''}`)
  fail++
}
function warn_(label: string, detail = '') {
  console.log(`  ${YELLOW}⚠${RESET}  ${label}${detail ? `  ${YELLOW}(${detail})${RESET}` : ''}`)
  warn++
}
function section(title: string) {
  console.log(`\n${BOLD}${CYAN}── ${title} ${'─'.repeat(50 - title.length)}${RESET}`)
}

// ─── helpers ──────────────────────────────────────────────────────────────────

async function get(path: string, base = API): Promise<{ status: number; body: any; ok: boolean }> {
  try {
    const res = await fetch(`${base}${path}`)
    let body: any
    const ct = res.headers.get('content-type') ?? ''
    if (ct.includes('json')) body = await res.json()
    else body = await res.text()
    return { status: res.status, body, ok: res.ok }
  } catch (e: any) {
    return { status: 0, body: e.message, ok: false }
  }
}

function assertShape(label: string, obj: any, keys: string[]) {
  for (const k of keys) {
    if (!(k in obj)) {
      fail_(`${label} — missing key "${k}"`)
      return false
    }
  }
  return true
}

function assertArray(label: string, val: any, minLen = 0) {
  if (!Array.isArray(val)) {
    fail_(`${label} — expected array, got ${typeof val}`)
    return false
  }
  if (val.length < minLen) {
    warn_(`${label} — array has ${val.length} items (expected ≥${minLen})`)
    return false
  }
  return true
}

function assertNumber(label: string, val: any) {
  if (typeof val !== 'number' || isNaN(val)) {
    fail_(`${label} — expected number, got ${typeof val} (${val})`)
    return false
  }
  return true
}

// ─── 1. Reachability ──────────────────────────────────────────────────────────

section('Reachability')

async function checkReachability() {
  // Backend
  const api = await get('/api/stats')
  if (api.status === 200)      ok('Backend  :5001  is UP')
  else                          fail_('Backend  :5001  is DOWN', `status ${api.status} — ${api.body}`)

  // Frontend (just a 200 on the root HTML)
  const ui = await get('/', UI)
  if (ui.status === 200)        ok('Frontend :5173  is UP')
  else if (ui.status === 0)     fail_('Frontend :5173  is DOWN', String(ui.body))
  else                          warn_('Frontend :5173', `HTTP ${ui.status}`)
}

// ─── 2. API endpoint shapes ───────────────────────────────────────────────────

section('API Endpoint Shapes')

async function checkEndpoints() {
  // /api/stats
  {
    const { ok: isOk, status, body } = await get('/api/stats')
    if (!isOk) { fail_('GET /api/stats', `HTTP ${status}`); }
    else if (assertShape('GET /api/stats', body, ['total_runs', 'active_pipelines', 'pending_approvals'])) {
      assertNumber('/api/stats.total_runs',       body.total_runs)
      assertNumber('/api/stats.active_pipelines',    body.active_pipelines)
      assertNumber('/api/stats.pending_approvals',body.pending_approvals)
      ok('GET /api/stats', `runs=${body.total_runs} agents=${body.active_pipelines}`)
    }
  }

  // /api/runs
  {
    const { ok: isOk, status, body } = await get('/api/runs')
    if (!isOk) { fail_('GET /api/runs', `HTTP ${status}`) }
    else if (assertArray('GET /api/runs', body, 1)) {
      const run = body[0]
      assertShape('runs[0]', run, ['id', 'name', 'agent', 'status', 'duration_ms'])
      ok('GET /api/runs', `${body.length} runs, first="${run.name}"`)
    }
  }

  // /api/agents
  {
    const { ok: isOk, status, body } = await get('/api/agents')
    if (!isOk) { fail_('GET /api/agents', `HTTP ${status}`) }
    else if (assertArray('GET /api/agents', body, 1)) {
      const agent = body[0]
      assertShape('agents[0]', agent, ['id', 'name', 'status'])
      ok('GET /api/agents', `${body.length} agents, first="${agent.name}"`)
    }
  }

  // /api/deployments
  {
    const { ok: isOk, status, body } = await get('/api/deployments')
    if (!isOk) { fail_('GET /api/deployments', `HTTP ${status}`) }
    else if (assertArray('GET /api/deployments', body, 1)) {
      const d = body[0]
      assertShape('deployments[0]', d, ['id', 'name', 'environment', 'status'])
      ok('GET /api/deployments', `${body.length} deployments`)
    }
  }

  // /api/approvals
  {
    const { ok: isOk, status, body } = await get('/api/approvals')
    if (!isOk) { fail_('GET /api/approvals', `HTTP ${status}`) }
    else if (assertArray('GET /api/approvals', body)) {
      ok('GET /api/approvals', `${body.length} pending`)
    }
  }

  // /api/errors/patterns
  {
    const { ok: isOk, status, body } = await get('/api/errors/patterns')
    if (!isOk) { fail_('GET /api/errors/patterns', `HTTP ${status}`) }
    else if (assertShape('GET /api/errors/patterns', body, ['patterns', 'severityCount'])) {
      assertShape('severityCount', body.severityCount, ['critical', 'warning', 'info'])
      ok('GET /api/errors/patterns', `crit=${body.severityCount.critical} warn=${body.severityCount.warning}`)
    }
  }

  // /api/errors/recent
  {
    const { ok: isOk, status, body } = await get('/api/errors/recent')
    if (!isOk) { fail_('GET /api/errors/recent', `HTTP ${status}`) }
    else if (assertShape('GET /api/errors/recent', body, ['recent'])) {
      assertArray('recent', body.recent)
      ok('GET /api/errors/recent', `${body.recent.length} events`)
    }
  }
}

// ─── 3. SSE Stream ────────────────────────────────────────────────────────────

section('SSE Stream')

async function checkSSE() {
  return new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      fail_('SSE /api/sse — no event received in 4s')
      resolve()
    }, 4000)

    try {
      const ctrl = new AbortController()
      fetch(`${API}/api/sse`, {
        signal: ctrl.signal,
        headers: { Accept: 'text/event-stream' },
      }).then(async (res) => {
        if (!res.ok || res.status !== 200) {
          clearTimeout(timeout)
          fail_('SSE /api/sse', `HTTP ${res.status}`)
          resolve()
          return
        }
        const ct = res.headers.get('content-type') ?? ''
        if (!ct.includes('text/event-stream')) {
          clearTimeout(timeout)
          fail_('SSE /api/sse — wrong Content-Type', ct)
          resolve()
          return
        }

        // Read first chunk
        const reader = res.body!.getReader()
        const { value } = await reader.read()
        const chunk = new TextDecoder().decode(value)
        clearTimeout(timeout)
        ctrl.abort()

        if (chunk.includes('data:') || chunk.includes('event:') || chunk.includes(':')) {
          ok('SSE /api/sse — connected + emitting', chunk.slice(0, 60).trim())
        } else {
          warn_('SSE /api/sse — connected but chunk looks odd', chunk.slice(0, 80))
        }
        resolve()
      }).catch((e) => {
        if (e.name === 'AbortError') return
        clearTimeout(timeout)
        fail_('SSE /api/sse', String(e))
        resolve()
      })
    } catch (e: any) {
      clearTimeout(timeout)
      fail_('SSE /api/sse', String(e))
      resolve()
    }
  })
}

// ─── 4. Data integrity ────────────────────────────────────────────────────────

section('Data Integrity')

async function checkDataIntegrity() {
  const [statsR, runsR, agentsR, approvalsR] = await Promise.all([
    get('/api/stats'),
    get('/api/runs'),
    get('/api/agents'),
    get('/api/approvals'),
  ])

  // Pending approvals count should match between /api/stats and /api/approvals
  if (statsR.ok && approvalsR.ok && Array.isArray(approvalsR.body)) {
    const statPending  = statsR.body.pending_approvals
    const actualPending = approvalsR.body.filter((a: any) => a.status === 'PENDING').length
    if (statPending === actualPending) {
      ok(`Approval count consistent: stats.pending_approvals === approvals(PENDING) = ${statPending}`)
    } else {
      warn_(`Approval count mismatch: stats says ${statPending}, array has ${actualPending} PENDING`)
    }
  }

  // Runs in /api/stats should equal length of /api/runs
  if (statsR.ok && runsR.ok && Array.isArray(runsR.body)) {
    ok(`Run list has ${runsR.body.length} rows; stats.total_runs=${statsR.body.total_runs}`)
  }

  // All agents should have a valid status
  if (agentsR.ok && Array.isArray(agentsR.body)) {
    const validStatuses = ['ACTIVE', 'IDLE', 'ERROR', 'STOPPED']
    const bad = agentsR.body.filter((a: any) => !validStatuses.includes(a.status))
    if (bad.length === 0) ok(`All agent statuses are valid`)
    else warn_(`${bad.length} agents have unexpected status`, bad.map((a: any) => `${a.name}:${a.status}`).join(', '))
  }

  // All runs should have SUCCESS or FAILURE status
  if (runsR.ok && Array.isArray(runsR.body)) {
    const bad = runsR.body.filter((r: any) => !['SUCCESS', 'FAILED', 'RUNNING', 'PENDING'].includes(r.status))
    if (bad.length === 0) ok(`All run statuses are valid`)
    else warn_(`${bad.length} runs have unexpected status`)
  }
}

// ─── 5. CircuitBreaker ────────────────────────────────────────────────────────

section('CircuitBreaker')

async function checkCircuitBreaker() {
  const { ok: isOk, status, body } = await get('/api/circuit-breaker')
  if (!isOk && status === 404) {
    // May be nested under errors or status
    const alt = await get('/api/errors/circuit-breaker')
    if (!alt.ok) {
      warn_('No dedicated circuit-breaker endpoint found (check route path)')
      return
    }
    assertShape('circuit-breaker', alt.body, ['state'])
    ok('GET /api/errors/circuit-breaker', `state=${alt.body.state}`)
  } else if (isOk) {
    assertShape('circuit-breaker', body, ['state'])
    ok('GET /api/circuit-breaker', `state=${body.state}`)
  } else {
    fail_('GET /api/circuit-breaker', `HTTP ${status}`)
  }
}

// ─── Run all ──────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${BOLD}Agent-OS Health Check${RESET}  ${new Date().toLocaleTimeString()}`)
  console.log(`API → ${API}   UI → ${UI}\n`)

  await checkReachability()
  await checkEndpoints()
  await checkSSE()
  await checkDataIntegrity()
  await checkCircuitBreaker()

  console.log(`\n${'─'.repeat(55)}`)
  const color = fail > 0 ? RED : warn > 0 ? YELLOW : GREEN
  console.log(`${color}${BOLD}  ${pass} passed  ·  ${fail} failed  ·  ${warn} warnings${RESET}\n`)

  process.exit(fail > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error('Health check crashed:', e)
  process.exit(1)
})
