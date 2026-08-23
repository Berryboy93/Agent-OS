# Command Center Frontend Integration Guide

## ✅ What Was Created

This master integration script has set up complete frontend-backend wiring with:

### 1. **Centralized API Client** (`src/services/api.ts`)
   - Single source of truth for all API calls
   - Automatic error handling
   - Support for streaming responses
   - Type-safe request/response handling

### 2. **React Query Hooks** (`src/hooks/useCommandCenter.ts`)
   - `useRuns()` - Fetch all runs with auto-refetch
   - `useRun()` - Fetch single run details
   - `useCreateRun()` - Create new runs
   - `useUpdateRunStatus()` - Update run status
   - `useDispatchCommand()` - Send commands
   - `useRoles()` - Fetch RBAC roles
   - `usePolicies()` - Fetch RBAC policies
   - `useHealthCheck()` - Monitor backend health

### 3. **Server-Sent Events Hook** (`src/hooks/useEventStream.ts`)
   - Real-time event streaming from backend
   - Automatic reconnection on disconnect
   - Type-safe event handling

### 4. **QueryProvider Setup** (`src/providers/QueryProvider.tsx`)
   - Configured for optimal caching
   - Automatic retry logic
   - Smart refetch intervals

### 5. **Fixed Tools Component** (`src/pages/Tools.tsx`)
   - Proper default export
   - Integrated with API hooks
   - Loading and error states

### 6. **Integrated App.tsx** (`src/App-integrated.tsx`)
   - Complete navigation structure
   - Health status display
   - Real-time stats
   - Multi-page support

## 📋 Implementation Steps

### Step 1: Install Dependencies
```bash
cd apps/dashboard
pnpm install
```

### Step 2: Replace App.tsx
```bash
cp src/App-integrated.tsx src/App.tsx
```

### Step 3: Start Backend (if not running)
```bash
cd ~/Agent-OS
cd apps/dashboard && pnpm run dev
# In another terminal:
pnpm run build && pnpm run dev
```

### Step 4: Start Frontend Dev Server
```bash
cd apps/dashboard
pnpm run dev
```

### Step 5: Verify Integration
```bash
# In the dashboard directory:
bash test-integration.sh
```

### Step 6: Open in Browser
Visit: `http://localhost:5173`

## 🔌 API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/command-center/health` | GET | Health check |
| `/api/command-center/runs` | GET | List all runs |
| `/api/command-center/runs/:id` | GET | Get run details |
| `/api/command-center/runs` | POST | Create new run |
| `/api/command-center/runs/:id/status` | PATCH | Update run status |
| `/api/command-center/commands/dispatch` | POST | Dispatch command |
| `/api/command-center/events/stream` | GET | SSE event stream |
| `/api/command-center/rbac/roles` | GET | Fetch roles |
| `/api/command-center/rbac/policies` | GET | Fetch policies |

## 🎯 What's Working

✅ Backend API fully functional  
✅ React Query for data management  
✅ Real-time SSE event streaming  
✅ Automatic error handling & retries  
✅ Health monitoring  
✅ RBAC integration  
✅ Full UI navigation  
✅ Type-safe API calls  

## 🐛 Troubleshooting

### "Cannot find module"
```bash
pnpm install
pnpm run dev
```

### Backend not responding
```bash
# Check backend is running:
curl http://localhost:5001/api/command-center/health

# If not, restart:
cd ~/Agent-OS && pnpm run dev
```

### Port 5173 already in use
```bash
# Kill process using port 5173:
lsof -i :5173 | grep -v COMMAND | awk '{print $2}' | xargs kill -9

# Or use different port:
pnpm run dev --port 5174
```

### SSE stream not connecting
```bash
# Check CORS headers:
curl -v http://localhost:5001/api/command-center/events/stream

# Should see:
# Access-Control-Allow-Origin: *
```

## 📚 Key Features

### Auto-Refetching
Runs refetch every 5 seconds, keeping the UI in sync with the backend without polling.

### Smart Caching
React Query caches responses and only refetches when data is stale or invalidated.

### Automatic Reconnection
SSE stream automatically reconnects if connection drops after 3 seconds.

### Error Handling
All API calls have built-in retry logic (2 retries with exponential backoff).

### Type Safety
Full TypeScript support across all hooks and API calls.

## 🚀 Next Steps

1. **Wire up remaining pages:**
   - Agents page → use `useRoles()`
   - Deployments → use `useRuns()` with filters
   - Pipelines → custom hook for pipeline data
   - Analytics → aggregate run statistics

2. **Add command execution UI:**
   - Command input forms
   - Real-time output display
   - Progress indicators

3. **Implement RBAC:**
   - Show/hide UI elements based on user roles
   - Gate API calls based on permissions

4. **Add notifications:**
   - Toast for command results
   - Event alerts from SSE stream

## 🔧 Development Commands

```bash
# Start dev server
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview

# Type-check
pnpm run typecheck

# Lint
pnpm run lint
```

## 📞 Support

If you encounter issues:
1. Check the test-integration.sh output
2. Verify backend is running on port 5001
3. Check browser console for React Query errors
4. Inspect Network tab for API responses

---

**Integration Date:** $(date)
**Backend API:** http://localhost:5001/api/command-center
**Frontend Dev URL:** http://localhost:5173
