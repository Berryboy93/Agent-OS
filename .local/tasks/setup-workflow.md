# Configure Dev Workflow

## What & Why
The project has no workflow configured, so the app cannot start. A workflow needs to be set up to run the dashboard server.

## Done looks like
- A workflow named "Start application" runs `pnpm --filter @agent-os/dashboard dev` (which executes `node server.js` in the dashboard app)
- The app is visible in the preview pane

## Out of scope
- Any code changes

## Steps
1. **Create and start workflow** — Read the workflows skill and configure a workflow named "Start application" with the command `pnpm --filter @agent-os/dashboard dev` run from the project root.

## Relevant files
- `apps/dashboard/package.json`
- `apps/dashboard/server.js`
- `apps/dashboard/vite.config.ts`
- `package.json`
