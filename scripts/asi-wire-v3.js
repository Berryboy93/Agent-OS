// scripts/asi-wire-v3.ts
import { Project, SyntaxKind } from "ts-morph";
import path from "path";
import { isSafePath } from "./asi-wire-safe-fs.ts";
const ROOT = process.env.ROOT_DIR || path.resolve(process.env.HOME || "", "Agent-OS");
const findings = [];
console.log("ASI WIRE v3 START (SAFE MODE)");
console.log("Root:", ROOT);
// -----------------------------
// 1. PROJECT LOAD (STRICT SCOPE)
// -----------------------------
const project = new Project({
    tsConfigFilePath: path.join(ROOT, "tsconfig.json"),
    skipAddingFilesFromTsConfig: false,
});
const files = project.getSourceFiles().filter(f => isSafePath(f.getFilePath()));
console.log(`Loaded ${files.length} safe files`);
// -----------------------------
// 2. AST ANALYSIS (NO REGEX)
// -----------------------------
for (const file of files) {
    const source = file.getSourceFile();
    const calls = source.getDescendantsOfKind(SyntaxKind.CallExpression);
    for (const call of calls) {
        const text = call.getExpression().getText();
        const line = call.getStartLineNumber();
        // STATE SYSTEM DETECTION
        if (text === "setState") {
            findings.push({
                file: file.getFilePath(),
                category: "STATE",
                subtype: "REACT_LEGACY_SETSTATE",
                line,
                confidence: 0.95,
            });
        }
        if (text === "set") {
            findings.push({
                file: file.getFilePath(),
                category: "STATE",
                subtype: "ZUSTAND_STATE_MUTATION",
                line,
                confidence: 0.85,
            });
        }
        // EVENT SYSTEM
        if (text === "emit") {
            findings.push({
                file: file.getFilePath(),
                category: "EVENT",
                subtype: "EVENT_BUS_EMIT",
                line,
                confidence: 0.9,
            });
        }
        if (text === "dispatch") {
            findings.push({
                file: file.getFilePath(),
                category: "STATE",
                subtype: "DISPATCH_USAGE",
                line,
                confidence: 0.7,
            });
        }
    }
}
// -----------------------------
// 3. FINAL VALIDATION PASS
// -----------------------------
function validateFindings(list) {
    return list.filter(f => f.file &&
        f.line > 0 &&
        f.confidence >= 0.7);
}
const validated = validateFindings(findings);
// -----------------------------
// 4. REPORT OUTPUT
// -----------------------------
import fs from "fs";
fs.mkdirSync(path.join(ROOT, "audit"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "audit/asi-wire-v3.json"), JSON.stringify({
    root: ROOT,
    totalFindings: validated.length,
    findings: validated,
    timestamp: new Date().toISOString(),
}, null, 2));
console.log("ASI WIRE v3 COMPLETE");
console.log("Findings:", validated.length);
//# sourceMappingURL=asi-wire-v3.js.map