/**
 * @package @agent-os/config
 * Environment validation and configuration
 * 
 * Run this on server startup to fail-fast with clear errors
 */

import { z } from 'zod';

// ============================================================================
// ENVIRONMENT SCHEMA
// ============================================================================

const EnvironmentSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),

  // Database
  DATABASE_URL: z.string().describe('SQLite database path or :memory:'),

  // Auth & Security
  JWT_SECRET: z.string().min(32).describe('Minimum 32 characters'),
  JWT_EXPIRY: z.string().default('24h'),

  // LLM Adapters (at least one required)
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  MISTRAL_API_KEY: z.string().optional(),
  COHERE_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().url().optional(),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'text']).default('json'),

  // Feature flags
  ENABLE_MIGRATIONS: z.string().transform((v: string) => v === 'true').default('true'),
  ENABLE_HEALTH_CHECKS: z.string().transform((v: string) => v === 'true').default('true'),
  ENABLE_RATE_LIMITING: z.string().transform((v: string) => v === 'true').default('true'),
  ENABLE_RBAC: z.string().transform((v: string) => v === 'true').default('true'),

  // Performance
  GRACEFUL_SHUTDOWN_TIMEOUT: z.coerce.number().default(30_000),
  MAX_REQUEST_SIZE: z.string().default('10mb'),
  WORKER_THREADS: z.coerce.number().default(4),
});

export type Environment = z.infer<typeof EnvironmentSchema>;

// ============================================================================
// VALIDATION FUNCTION
// ============================================================================

export function validateEnvironment(): Environment {
  try {
    const env = EnvironmentSchema.parse(process.env);

    // Additional validation: at least one LLM adapter configured
    const hasAdapter =
      env.ANTHROPIC_API_KEY ||
      env.OPENAI_API_KEY ||
      env.GOOGLE_API_KEY ||
      env.MISTRAL_API_KEY ||
      env.COHERE_API_KEY ||
      env.OLLAMA_BASE_URL;

    if (!hasAdapter) {
      throw new Error(
        'No LLM adapter configured. Set at least one of: ' +
          'ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY, MISTRAL_API_KEY, COHERE_API_KEY, OLLAMA_BASE_URL'
      );
    }

    // Validate JWT secret strength
    if (env.NODE_ENV === 'production' && env.JWT_SECRET.length < 64) {
      console.warn('[Config] ⚠️  JWT_SECRET is < 64 characters in production (recommended: 64+)');
    }

    // Success
    console.log('[Config] ✅ Environment validation passed');
    console.log(`[Config] Environment: ${env.NODE_ENV}`);
    console.log(`[Config] Database: ${env.DATABASE_URL}`);
    console.log(`[Config] Port: ${env.PORT}`);

    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[Config] ❌ Environment validation failed');
      console.error('');
      console.error('Missing or invalid environment variables:');
      console.error('');

      error.issues.forEach((issue: z.ZodIssue) => {
        const path = issue.path.join('.');
        const message = issue.message;
        console.error(`  ${path}: ${message}`);
      });

      console.error('');
      console.error('Required variables:');
      console.error('  - DATABASE_URL');
      console.error('  - JWT_SECRET (min 32 chars)');
      console.error('  - At least one LLM adapter (ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.)');
      console.error('');
      console.error('See .env.example for all options');

      process.exit(1);
    } else if (error instanceof Error) {
      console.error('[Config] ❌ Configuration error:', error.message);
      process.exit(1);
    } else {
      console.error('[Config] ❌ Unknown configuration error');
      process.exit(1);
    }
  }
}

// ============================================================================
// BOOTSTRAP INTEGRATION
// ============================================================================

/**
 * Usage in apps/dashboard/server.ts:
 * 
 * import { validateEnvironment } from '@agent-os/config';
 * 
 * const env = validateEnvironment(); // Runs on startup, fails if invalid
 * 
 * const app = express();
 * const db = createClient(env.DATABASE_URL);
 * 
 * // Now safe to use env.ANTHROPIC_API_KEY, etc.
 */

export default validateEnvironment;

// ============================================================================
// .env.example TEMPLATE
// ============================================================================

const envExample = `
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=./agent-os.db

# Authentication (REQUIRED)
JWT_SECRET=your-secret-key-minimum-32-characters-change-in-production
JWT_EXPIRY=24h

# LLM Adapters (configure at least ONE)
# ANTHROPIC
ANTHROPIC_API_KEY=sk-ant-...

# OPENAI
# OPENAI_API_KEY=sk-...

# GOOGLE GEMINI
# GOOGLE_API_KEY=AIza...

# MISTRAL
# MISTRAL_API_KEY=...

# COHERE
# COHERE_API_KEY=...

# OLLAMA (local)
# OLLAMA_BASE_URL=http://localhost:11434

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Feature Flags
ENABLE_MIGRATIONS=true
ENABLE_HEALTH_CHECKS=true
ENABLE_RATE_LIMITING=true
ENABLE_RBAC=true

# Performance
GRACEFUL_SHUTDOWN_TIMEOUT=30000
MAX_REQUEST_SIZE=10mb
WORKER_THREADS=4
`;

export { envExample };

// ============================================================================
// CONFIGURATION CLASS (for non-Zod environments)
// ============================================================================

export class Config {
  private static instance: Config;
  private env: Environment;

  private constructor(env: Environment) {
    this.env = env;
  }

  static initialize(): Config {
    if (!Config.instance) {
      const env = validateEnvironment();
      Config.instance = new Config(env);
    }
    return Config.instance;
  }

  static getInstance(): Config {
    if (!Config.instance) {
      throw new Error('Config not initialized. Call Config.initialize() first.');
    }
    return Config.instance;
  }

  get<K extends keyof Environment>(key: K): Environment[K] {
    return this.env[key];
  }

  getAll(): Environment {
    return { ...this.env };
  }

  isDevelopment(): boolean {
    return this.env.NODE_ENV === 'development';
  }

  isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  isStaging(): boolean {
    return this.env.NODE_ENV === 'staging';
  }
}

/**
 * Alternative usage:
 * 
 * const config = Config.initialize();
 * const port = config.get('PORT');
 * const isDev = config.isDevelopment();
 */
