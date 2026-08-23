import { initTRPC } from '@trpc/server';
import type { IncomingMessage } from 'node:http';

// Export Context so agentProcedure can be named
export interface Context {
  req: IncomingMessage & {
    headers: Record<string, string | string[]>;
  };
  [key: string]: unknown;
}

export const t = initTRPC.context<Context>().create();

export const router = t.router;
export const procedure = t.procedure;
export const middleware = t.middleware;
