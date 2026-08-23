# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard.spec.ts >> Overview — Data Wiring >> Event Stream shows Live badge
- Location: e2e/dashboard.spec.ts:111:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5173/
Call log:
  - navigating to "http://127.0.0.1:5173/", waiting until "load"

```

# Test source

```ts
  1   | /**
  2   |  * Agent-OS Dashboard — Playwright E2E Suite
  3   |  * Covers: routing, data wiring, SSE stream, error predictor, circuit breaker
  4   |  *
  5   |  * Setup (one-time, from ~/Agent-OS/apps/dashboard):
  6   |  *   pnpm add -D @playwright/test
  7   |  *   npx playwright install chromium
  8   |  *
  9   |  * Run (server must already be up on :5001 and :5173):
  10  |  *   npx playwright test e2e/dashboard.spec.ts --reporter=list
  11  |  */
  12  | 
  13  | import { test, expect, type Page, type APIRequestContext } from '@playwright/test'
  14  | 
  15  | const UI  = 'http://127.0.0.1:5173'
  16  | const API = 'http://127.0.0.1:5001'
  17  | 
  18  | // ─── helpers ──────────────────────────────────────────────────────────────────
  19  | 
  20  | async function goto(page: Page, path: string) {
> 21  |   await page.goto(`${UI}${path}`)
      |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5173/
  22  |   // wait for Vite HMR settle
  23  |   await page.waitForLoadState('networkidle')
  24  | }
  25  | 
  26  | async function apiGet(request: APIRequestContext, path: string) {
  27  |   return request.get(`${API}${path}`)
  28  | }
  29  | 
  30  | // ─── 1. Page routing ──────────────────────────────────────────────────────────
  31  | 
  32  | test.describe('Page Routing', () => {
  33  |   const routes = [
  34  |     { path: '/',            title: /overview/i,     heading: /system status|overview/i },
  35  |     { path: '/runs',        title: /runs/i,          heading: /runs/i },
  36  |     { path: '/agents',      title: /agents/i,        heading: /agents/i },
  37  |     { path: '/deployments', title: /deployments/i,   heading: /deploy/i },
  38  |     { path: '/approvals',   title: /approvals/i,     heading: /approv/i },
  39  |   ]
  40  | 
  41  |   for (const { path, heading } of routes) {
  42  |     test(`${path} renders without crashing`, async ({ page }) => {
  43  |       await goto(page, path)
  44  |       // No error boundary text
  45  |       await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  46  |       await expect(page.getByText(/cannot read/i)).not.toBeVisible()
  47  |       // Page body has content (not blank)
  48  |       const body = await page.textContent('body')
  49  |       expect(body?.trim().length).toBeGreaterThan(50)
  50  |     })
  51  |   }
  52  | })
  53  | 
  54  | // ─── 2. Sidebar navigation ────────────────────────────────────────────────────
  55  | 
  56  | test.describe('Sidebar Navigation', () => {
  57  |   test('sidebar renders all nav links', async ({ page }) => {
  58  |     await goto(page, '/')
  59  |     const links = ['Overview', 'Runs', 'Agents', 'Deployments', 'Approvals']
  60  |     for (const label of links) {
  61  |       await expect(page.getByRole('link', { name: label })).toBeVisible()
  62  |     }
  63  |   })
  64  | 
  65  |   test('clicking Runs navigates to /runs', async ({ page }) => {
  66  |     await goto(page, '/')
  67  |     await page.getByRole('link', { name: 'Runs' }).click()
  68  |     await expect(page).toHaveURL(/\/runs/)
  69  |   })
  70  | 
  71  |   test('clicking Agents navigates to /agents', async ({ page }) => {
  72  |     await goto(page, '/')
  73  |     await page.getByRole('link', { name: 'Agents' }).click()
  74  |     await expect(page).toHaveURL(/\/agents/)
  75  |   })
  76  | 
  77  |   test('clicking Deployments navigates to /deployments', async ({ page }) => {
  78  |     await goto(page, '/')
  79  |     await page.getByRole('link', { name: 'Deployments' }).click()
  80  |     await expect(page).toHaveURL(/\/deployments/)
  81  |   })
  82  | 
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
```