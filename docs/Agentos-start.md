# Terminal 1 — watch backend logs
cd ~/Agent-OS/apps/dashboard
node server.ts        # Ctrl+C to stop

# Terminal 2 — watch frontend build logs  
cd ~/Agent-OS/apps/dashboard
npx vite dev          # Ctrl+C to stop




Option 2: Background (best for "set it and forget it")
cd ~/Agent-OS/apps/dashboard
node server.ts &      # Background
npx vite dev &        # Background
# Later: kill 12418 12419



Option 3: Production mode (single server, no Vite)
cd ~/Agent-OS/apps/dashboard
npx vite build        # Build once
node server.ts        # Backend serves dist/ on :5000
