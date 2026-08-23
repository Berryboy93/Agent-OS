# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard.spec.ts >> Backend API >> GET /api/agents → 200 + array with items
- Location: e2e/dashboard.spec.ts:175:3

# Error details

```
Error: expect(received).toHaveProperty(path)

Expected path: "status"
Received path: []

Received value: {"created_at": 1781588107000, "description": "Reviews code for bugs, style issues, and best practices", "id": "code-reviewer", "name": "Code Reviewer", "updated_at": 1781588107000, "version": "1.0.0"}
```

# Test source

```ts
  83  |   test('sidebar shows Healthy system status', async ({ page }) => {
  84  |     await goto(page, '/')
  85  |     await expect(page.getByText(/healthy/i).first()).toBeVisible()
  86  |   })
  87  | 
  88  |   test('sidebar Agent-OS branding is visible', async ({ page }) => {
  89  |     await goto(page, '/')
  90  |     await expect(page.getByText(/agent-os/i).first()).toBeVisible()
  91  |   })
  92  | })
  93  | 
  94  | // ─── 3. Overview — live data ──────────────────────────────────────────────────
  95  | 
  96  | test.describe('Overview — Data Wiring', () => {
  97  |   test('stats grid renders (not all zeros)', async ({ page }) => {
  98  |     await goto(page, '/')
  99  |     // Give the fetch time to resolve
  100 |     await page.waitForTimeout(2000)
  101 |     const body = await page.textContent('body')
  102 |     // The page should have some numeric content from the DB
  103 |     expect(body).toMatch(/\d/)
  104 |   })
  105 | 
  106 |   test('Event Stream panel is visible', async ({ page }) => {
  107 |     await goto(page, '/')
  108 |     await expect(page.getByText(/event stream/i)).toBeVisible()
  109 |   })
  110 | 
  111 |   test('Event Stream shows Live badge', async ({ page }) => {
  112 |     await goto(page, '/')
  113 |     await page.waitForTimeout(1500)
  114 |     await expect(page.getByText(/live/i).first()).toBeVisible()
  115 |   })
  116 | 
  117 |   test('Event Stream shows at least one event', async ({ page }) => {
  118 |     await goto(page, '/')
  119 |     await page.waitForTimeout(3000)
  120 |     // RUN_CREATED or SYSTEM_START should appear (from seeded data / SSE)
  121 |     const hasEvent = await page.getByText(/RUN_CREATED|SYSTEM_START|RUN_COMPLETED/).count()
  122 |     expect(hasEvent).toBeGreaterThan(0)
  123 |   })
  124 | 
  125 |   test('System Status stat card present', async ({ page }) => {
  126 |     await goto(page, '/')
  127 |     await expect(page.getByText(/system status/i)).toBeVisible()
  128 |   })
  129 | })
  130 | 
  131 | // ─── 4. Approvals badge ───────────────────────────────────────────────────────
  132 | 
  133 | test.describe('Approvals Badge', () => {
  134 |   test('approvals badge count matches API', async ({ page, request }) => {
  135 |     const res = await apiGet(request, '/api/approvals')
  136 |     const approvals = await res.json()
  137 |     const pending = approvals.filter((a: any) => a.status === 'PENDING').length
  138 | 
  139 |     await goto(page, '/')
  140 | 
  141 |     if (pending > 0) {
  142 |       // Badge should be visible with the right number
  143 |       await expect(page.getByText(String(pending))).toBeVisible()
  144 |     }
  145 |     // If 0, no badge — that's fine too
  146 |   })
  147 | })
  148 | 
  149 | // ─── 5. Backend API (via Playwright request) ──────────────────────────────────
  150 | 
  151 | test.describe('Backend API', () => {
  152 |   test('GET /api/stats → 200 + required fields', async ({ request }) => {
  153 |     const res = await apiGet(request, '/api/stats')
  154 |     expect(res.status()).toBe(200)
  155 |     const body = await res.json()
  156 |     expect(body).toHaveProperty('total_runs')
  157 |     expect(body).toHaveProperty('active_agents')
  158 |     expect(body).toHaveProperty('pending_approvals')
  159 |     expect(typeof body.total_runs).toBe('number')
  160 |     expect(typeof body.active_agents).toBe('number')
  161 |   })
  162 | 
  163 |   test('GET /api/runs → 200 + array with items', async ({ request }) => {
  164 |     const res = await apiGet(request, '/api/runs')
  165 |     expect(res.status()).toBe(200)
  166 |     const body = await res.json()
  167 |     expect(Array.isArray(body)).toBe(true)
  168 |     expect(body.length).toBeGreaterThan(0)
  169 |     expect(body[0]).toHaveProperty('id')
  170 |     expect(body[0]).toHaveProperty('name')
  171 |     expect(body[0]).toHaveProperty('status')
  172 |     expect(body[0]).toHaveProperty('duration_ms')
  173 |   })
  174 | 
  175 |   test('GET /api/agents → 200 + array with items', async ({ request }) => {
  176 |     const res = await apiGet(request, '/api/agents')
  177 |     expect(res.status()).toBe(200)
  178 |     const body = await res.json()
  179 |     expect(Array.isArray(body)).toBe(true)
  180 |     expect(body.length).toBeGreaterThan(0)
  181 |     expect(body[0]).toHaveProperty('id')
  182 |     expect(body[0]).toHaveProperty('name')
> 183 |     expect(body[0]).toHaveProperty('status')
      |                     ^ Error: expect(received).toHaveProperty(path)
  184 |   })
  185 | 
  186 |   test('GET /api/deployments → 200 + array', async ({ request }) => {
  187 |     const res = await apiGet(request, '/api/deployments')
  188 |     expect(res.status()).toBe(200)
  189 |     const body = await res.json()
  190 |     expect(Array.isArray(body)).toBe(true)
  191 |   })
  192 | 
  193 |   test('GET /api/approvals → 200 + array', async ({ request }) => {
  194 |     const res = await apiGet(request, '/api/approvals')
  195 |     expect(res.status()).toBe(200)
  196 |     const body = await res.json()
  197 |     expect(Array.isArray(body)).toBe(true)
  198 |   })
  199 | 
  200 |   test('GET /api/errors/patterns → 200 + patterns + severityCount', async ({ request }) => {
  201 |     const res = await apiGet(request, '/api/errors/patterns')
  202 |     expect(res.status()).toBe(200)
  203 |     const body = await res.json()
  204 |     expect(body).toHaveProperty('patterns')
  205 |     expect(body).toHaveProperty('severityCount')
  206 |     expect(body.severityCount).toHaveProperty('critical')
  207 |     expect(body.severityCount).toHaveProperty('warning')
  208 |     expect(body.severityCount).toHaveProperty('info')
  209 |   })
  210 | 
  211 |   test('GET /api/errors/recent → 200 + recent array', async ({ request }) => {
  212 |     const res = await apiGet(request, '/api/errors/recent')
  213 |     expect(res.status()).toBe(200)
  214 |     const body = await res.json()
  215 |     expect(body).toHaveProperty('recent')
  216 |     expect(Array.isArray(body.recent)).toBe(true)
  217 |   })
  218 | 
  219 |   test('SSE endpoint responds with text/event-stream', async ({ request }) => {
  220 |     const res = await request.get(`${API}/api/stream`, {
  221 |       headers: { Accept: 'text/event-stream' },
  222 |       timeout: 3000,
  223 |     }).catch(() => null)
  224 | 
  225 |     if (res) {
  226 |       expect(res.status()).toBe(200)
  227 |       const ct = res.headers()['content-type'] ?? ''
  228 |       expect(ct).toMatch(/text\/event-stream/)
  229 |     }
  230 |     // If it times out it's expected for a streaming endpoint — just checking headers
  231 |   })
  232 | 
  233 |   test('unknown route → 404', async ({ request }) => {
  234 |     const res = await apiGet(request, '/api/does-not-exist')
  235 |     expect(res.status()).toBe(404)
  236 |   })
  237 | })
  238 | 
  239 | // ─── 6. Error Predictor panel ─────────────────────────────────────────────────
  240 | 
  241 | test.describe('Error Predictor Panel', () => {
  242 |   test('PredictionPanel or error section is rendered on Overview', async ({ page }) => {
  243 |     await goto(page, '/')
  244 |     await page.waitForTimeout(2000)
  245 |     // Look for error predictor related text
  246 |     const hasPrediction = await page.getByText(/predict|error pattern|compound/i).count()
  247 |     // It's fine if 0 — just means the panel isn't shown in current data state
  248 |     // But no JS crash should occur
  249 |     await expect(page.getByText(/cannot read/i)).not.toBeVisible()
  250 |     await expect(page.getByText(/undefined/i)).not.toBeVisible()
  251 |   })
  252 | 
  253 |   test('severityCount fields are numbers', async ({ request }) => {
  254 |     const res = await apiGet(request, '/api/errors/patterns')
  255 |     const body = await res.json()
  256 |     expect(typeof body.severityCount.critical).toBe('number')
  257 |     expect(typeof body.severityCount.warning).toBe('number')
  258 |     expect(typeof body.severityCount.info).toBe('number')
  259 |   })
  260 | })
  261 | 
  262 | // ─── 7. No console errors ─────────────────────────────────────────────────────
  263 | 
  264 | test.describe('Console Health', () => {
  265 |   test('Overview loads with no console errors', async ({ page }) => {
  266 |     const errors: string[] = []
  267 |     page.on('console', msg => {
  268 |       if (msg.type() === 'error') errors.push(msg.text())
  269 |     })
  270 |     page.on('pageerror', err => errors.push(err.message))
  271 | 
  272 |     await goto(page, '/')
  273 |     await page.waitForTimeout(3000)
  274 | 
  275 |     // Filter out known non-fatal noise
  276 |     const fatal = errors.filter(e =>
  277 |       !e.includes('favicon') &&
  278 |       !e.includes('ResizeObserver') &&
  279 |       !e.includes('punycode') &&
  280 |       !e.includes('SourceMap')
  281 |     )
  282 |     if (fatal.length > 0) {
  283 |       console.log('Console errors:', fatal)
```