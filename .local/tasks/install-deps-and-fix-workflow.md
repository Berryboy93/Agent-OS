# Install Dependencies and Start Dashboard

## What & Why
The project has never had `pnpm install` run, so `node_modules` is empty and the dashboard server fails immediately with `Cannot find package 'express'`. This task installs all workspace dependencies and configures a workflow so the app starts correctly.

## Done looks like
- `pnpm install` completes without errors
- The dashboard server starts on port 5000 without module-not-found errors
- A `Start application` workflow is configured and running

## Out of scope
- Any code changes to the dashboard or packages
- Adding new dependencies

## Steps
1. **Install dependencies** — Run `pnpm install` from the workspace root to install all packages across all workspace members (`packages/*` and `apps/*`).
2. **Configure and start the workflow** — Set up a `Start application` workflow that runs `node apps/dashboard/server.js` (the pre-built JS entry point referenced in `replit.md`) on port 5000. If the pre-built `server.js` is stale or missing, use `npx tsx apps/dashboard/server.ts` as the dev command instead, consistent with the root `dev` script.

## Relevant files
- `package.json`
- `pnpm-workspace.yaml`
- `apps/dashboard/package.json`
- `apps/dashboard/server.ts`
- `apps/dashboard/server.js`
