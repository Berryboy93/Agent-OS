export interface RedactionResult {
    data: Record<string, unknown>;
    redactionIncomplete: boolean;
}
export declare function redactEventData(data: Record<string, unknown>, sensitiveFields?: string[]): RedactionResult;
//# sourceMappingURL=redaction.d.ts.map