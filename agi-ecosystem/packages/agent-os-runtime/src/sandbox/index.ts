import { VM } from 'vm2';
import { v4 as uuidv4 } from 'uuid';

export interface SandboxResult {
  success: boolean;
  output: any;
  logs: string[];
  execution_time_ms: number;
  memory_peak_mb: number;
  error?: string;
}

export interface SandboxConfig {
  timeout_ms: number;
  memory_limit_mb: number;
  cpu_limit_percent: number;
  allowed_modules: string[];
  network_access: boolean;
  file_system_access: boolean;
}

export class AgentSandbox {
  private vm: VM;
  private config: SandboxConfig;

  constructor(config: Partial<SandboxConfig> = {}) {
    this.config = {
      timeout_ms: 30000,
      memory_limit_mb: 128,
      cpu_limit_percent: 50,
      allowed_modules: ['math', 'json', 'crypto'],
      network_access: false,
      file_system_access: false,
      ...config
    };

    this.vm = new VM({
      timeout: this.config.timeout_ms,
      sandbox: {
        console: {
          log: (...args: any[]) => this.logs.push(args.map(a => String(a)).join(' ')),
          error: (...args: any[]) => this.logs.push('ERROR: ' + args.map(a => String(a)).join(' '))
        },
        Math,
        JSON,
        Date,
        setTimeout: () => { throw new Error('setTimeout not allowed'); },
        setInterval: () => { throw new Error('setInterval not allowed'); },
        require: (module: string) => {
          if (!this.config.allowed_modules.includes(module)) {
            throw new Error(`Module '${module}' not in allowlist`);
          }
          // In production, use a secure module loader
          return {};
        }
      },
      eval: false,
      wasm: false
    });
  }

  private logs: string[] = [];

  async execute(code: string, input: Record<string, any> = {}): Promise<SandboxResult> {
    const startTime = Date.now();
    this.logs = [];

    try {
      // Inject input variables
      for (const [key, value] of Object.entries(input)) {
        this.vm.set(key, value);
      }

      // Execute in sandbox
      const result = this.vm.run(code);

      return {
        success: true,
        output: result,
        logs: this.logs,
        execution_time_ms: Date.now() - startTime,
        memory_peak_mb: 0 // Would use process.memoryUsage() in Node
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        logs: this.logs,
        execution_time_ms: Date.now() - startTime,
        memory_peak_mb: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  getConfig(): SandboxConfig {
    return { ...this.config };
  }
}
