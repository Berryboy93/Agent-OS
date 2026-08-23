// scripts/asi-wire-safe-fs.ts

import fs from "fs"
import path from "path"

const BLOCKED_PATTERNS = [
  "node_modules",
  ".pnpm",
  "dist",
  "build",
  ".git",
  "audit",
  "artifacts",
  "mockup",
]

export function isSafePath(filePath: string): boolean {
  return !BLOCKED_PATTERNS.some(p => filePath.includes(p))
}

export function readFileSafe(filePath: string): string {
  if (!isSafePath(filePath)) {
    throw new Error(`Blocked read: ${filePath}`)
  }
  return fs.readFileSync(filePath, "utf-8")
}

export function writeFileSafe(filePath: string, content: string) {
  if (!isSafePath(filePath)) {
    throw new Error(`Blocked write: ${filePath}`)
  }

  fs.writeFileSync(filePath, content, "utf-8")
}
