const SECRET_PATTERNS: RegExp[] = [
  /sk-ant-[a-zA-Z0-9\-_]{20,}/g,
  /sk-[a-zA-Z0-9]{20,}/g,
  /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,
  /(?:api[_-]?key|apikey|access[_-]?token|secret[_-]?key)['":\s=]+["']?([a-zA-Z0-9\-_]{16,})["']?/gi,
  /ghp_[a-zA-Z0-9]{36}/g,
  /ghs_[a-zA-Z0-9]{36}/g,
  /eyJ[a-zA-Z0-9\-_]+\.eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/g,
  /AKIA[0-9A-Z]{16}/g,
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
];

const PII_PATTERNS: RegExp[] = [
  /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
];

const REDACTED = "[REDACTED]";
const ENTROPY_THRESHOLD = 4.5;
const ENTROPY_MIN_LEN = 20;

function shannonEntropy(s: string): number {
  const freq = new Map<string, number>();
  for (const c of s)
    freq.set(c, (freq.get(c) ?? 0) + 1,
    );
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / s.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function isHighEntropy(s: string): boolean {
  return s.length >= ENTROPY_MIN_LEN && shannonEntropy(s) >= ENTROPY_THRESHOLD;
}

function redactString(s: string): string {
  let result = s;

  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(
      new RegExp(pattern.source, pattern.flags),
      REDACTED,
    );
  }

  for (const pattern of PII_PATTERNS) {
    result = result.replace(
      new RegExp(pattern.source, pattern.flags),
      REDACTED,
    );
  }

  result = result.replace(/\b([a-zA-Z0-9+/]{20,}={0,2})\b/g, (match) => {
    if (isHighEntropy(match)) return REDACTED;
    return match;
  });

  return result;
}

function redactValue(
  val: unknown,
  sensitiveKeys: Set<string>,
  key = "",
): [unknown, boolean] {
  if (sensitiveKeys.has(key)) return [REDACTED, false];

  if (typeof val === "string") {
    const redacted = redactString(val);
    return [redacted, false];
  }

  if (Array.isArray(val)) {
    let anyRedacted = false;
    const result = val.map((item) => {
      const [r, incomplete] = redactValue(item, sensitiveKeys);
      if (incomplete) anyRedacted = true;
      return r;
    });
    return [result, anyRedacted];
  }

  if (val !== null && typeof val === "object") {
    const result: Record<string, unknown> = {};
    let anyRedacted = false;
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      const [r, incomplete] = redactValue(v, sensitiveKeys, k);
      if (incomplete) anyRedacted = true;
      result[k] = r;
    }
    return [result, anyRedacted];
  }

  return [val, false];
}

export interface RedactionResult {
  data: Record<string, unknown>;
  redactionIncomplete: boolean;
}

const SENSITIVE_FIELD_NAMES = new Set([
  "apiKey",
  "api_key",
  "secret",
  "password",
  "token",
  "accessToken",
  "access_token",
  "privateKey",
  "private_key",
  "credential",
  "credentials",
  "authorization",
  "Authorization",
]);

export function redactEventData(
  data: Record<string, unknown>,
  sensitiveFields: string[] = [],
): RedactionResult {
  const sensitiveKeys = new Set([...SENSITIVE_FIELD_NAMES, ...sensitiveFields]);

  try {
    const [redacted, incomplete] = redactValue(data, sensitiveKeys);
    return {
      data: redacted as Record<string, unknown>,
      redactionIncomplete: incomplete,
    };
  } catch {
    return {
      data: { _redaction_error: true },
      redactionIncomplete: true,
    };
  }
}
