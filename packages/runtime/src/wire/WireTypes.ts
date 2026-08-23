export type Mutation = {
  id: string
  actor: string
  action: string
  target?: string
  payload?: unknown
  timestamp: number
}

export type WireCheckResult =
  | { ok: true }
  | { ok: false; reason: string }
