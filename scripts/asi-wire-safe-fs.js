// scripts/asi-wire-safe-fs.ts
import fs from "fs";
const BLOCKED_PATTERNS = [
    "node_modules",
    ".pnpm",
    "dist",
    "build",
    ".git",
    "audit",
    "artifacts",
    "mockup",
];
export function isSafePath(filePath) {
    return !BLOCKED_PATTERNS.some(p => filePath.includes(p));
}
export function readFileSafe(filePath) {
    if (!isSafePath(filePath)) {
        throw new Error(`Blocked read: ${filePath}`);
    }
    return fs.readFileSync(filePath, "utf-8");
}
export function writeFileSafe(filePath, content) {
    if (!isSafePath(filePath)) {
        throw new Error(`Blocked write: ${filePath}`);
    }
    fs.writeFileSync(filePath, content, "utf-8");
}
//# sourceMappingURL=asi-wire-safe-fs.js.map