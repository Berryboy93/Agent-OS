export interface ShutdownHandler {
  name: string
  priority: number
  timeout: number
  fn: () => Promise<void>
}

export class LifecycleManager {
  private handlers: ShutdownHandler[] = []
  private shuttingDown = false
  private readonly gracefulTimeout: number

  constructor(options: { gracefulTimeout?: number } = {}) {
    this.gracefulTimeout = options.gracefulTimeout || 30_000
    process.on('SIGTERM', () => this.shutdown('SIGTERM'))
    process.on('SIGINT', () => this.shutdown('SIGINT'))
  }

  register(handler: ShutdownHandler): void {
    if (this.shuttingDown) {
      throw new Error('Cannot register handlers during shutdown')
    }
    this.handlers.push(handler)
    this.handlers.sort((a, b) => b.priority - a.priority)
  }

  async shutdown(signal: string): Promise<void> {
    if (this.shuttingDown) return
    this.shuttingDown = true

    console.log(`[lifecycle] Shutdown triggered by ${signal}`)
    console.log(`[lifecycle] Running ${this.handlers.length} shutdown handlers...`)

    for (const handler of this.handlers) {
      const start = Date.now()
      try {
        await Promise.race([
          handler.fn(),
          new Promise((_, rej) =>
            setTimeout(() => rej(new Error('Handler timeout')), handler.timeout)
          ),
        ])
        console.log(`[lifecycle] ✓ ${handler.name} (${Date.now() - start}ms)`)
      } catch (err) {
        console.error(`[lifecycle] ✗ ${handler.name}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    process.exit(0)
  }
}
