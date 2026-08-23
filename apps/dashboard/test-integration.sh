#!/bin/bash

echo "🧪 Testing Command Center Integration..."

# Test backend connectivity
echo "Testing backend health..."
HEALTH=$(curl -s http://localhost:5001/api/command-center/health)
if echo "$HEALTH" | grep -q "ok"; then
    echo "✅ Backend health: OK"
else
    echo "❌ Backend not responding"
    exit 1
fi

# Test runs endpoint
echo "Testing runs endpoint..."
RUNS=$(curl -s http://localhost:5001/api/command-center/runs)
if echo "$RUNS" | grep -q "data"; then
    echo "✅ Runs endpoint: Working"
else
    echo "⚠️  Runs endpoint returned no data"
fi

# Test SSE connection
echo "Testing SSE stream..."
timeout 2 curl -N http://localhost:5001/api/command-center/events/stream 2>/dev/null && echo "✅ SSE stream: Connected" || echo "⚠️  SSE stream: Could not connect"

echo ""
echo "✅ Integration test complete!"
echo ""
echo "Next steps:"
echo "1. Update your src/App.tsx with the integrated version"
echo "2. Run: cd $DASHBOARD_DIR && pnpm install"
echo "3. Run: pnpm run dev"
echo "4. Visit: http://localhost:5173"
