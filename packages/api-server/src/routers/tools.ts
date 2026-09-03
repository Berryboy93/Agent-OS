import type { Request, Response, Router as ExpressRouter } from 'express';
import express from 'express';

// Explicitly type router to avoid TS2742 type inference issues
const router: ExpressRouter = express.Router();

/**
 * POST /tools
 * Execute a tool via the Agent-OS runtime
 */
router.post('/tools', async (req: Request, res: Response): Promise<void> => {
  try {
    const { toolName, input } = req.body;
    
    if (!toolName) {
      res.status(400).json({ error: 'toolName is required' });
      return;
    }

    // TODO: Implement tool execution via @agent-os/runtime
    res.json({ 
      success: true, 
      tool: toolName,
      result: null 
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * GET /tools
 * List available tools
 */
router.get('/tools', (req: Request, res: Response): void => {
  // TODO: Fetch from @agent-os/core
  res.json({ tools: [] });
});

export { router };
