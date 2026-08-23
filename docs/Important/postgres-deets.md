read -s 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

export ANTHROPIC_API_KEY=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

export ANTHROPIC_API_KEY=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
agos run agent code-reviewer --input '{"task":"Review this code for bugs"}'


echo "ANTHROPIC_API_KEY=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" > ~/Agent-OS/.env


# Kill old server
fuser -k 5000/tcp 2>/dev/null

# Start with key
cd ~/Agent-OS
ANTHROPIC_API_KEY="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
" pnpm dev


# Kill old server if running
fuser -k 5000/tcp 2>/dev/null

# Start with API key
cd ~/Agent-OS
ANTHROPIC_API_KEY="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" pnpm dev


# Kill the server
fuser -k 5000/tcp 2>/dev/null

# Set the key securely (input will be hidden)
cd ~/Agent-OS
read -s ANTHROPIC_API_KEY
# Type your real key, press Enter
export ANTHROPIC_API_KEY="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"

# Verify it's set (shows first 20 chars only)
echo $ANTHROPIC_API_KEY | head -c 20

# Start the server
pnpm dev