export class BaseAdapter {
    supports(feature) {
        return this.supportedFeatures().includes(feature);
    }
    supportedFeatures() {
        return [];
    }
    mergeUsage(a, b) {
        return {
            inputTokens: (a.inputTokens ?? 0) + (b.inputTokens ?? 0),
            outputTokens: (a.outputTokens ?? 0) + (b.outputTokens ?? 0),
            totalTokens: (a.totalTokens ?? 0) + (b.totalTokens ?? 0),
        };
    }
}
//# sourceMappingURL=base.js.map