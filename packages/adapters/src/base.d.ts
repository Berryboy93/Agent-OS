import type { AdapterInstance, AdapterFeature, AdapterRunConfig, AdapterResult, Message, StreamChunk, TokenUsage } from '@agent-os/core';
export declare abstract class BaseAdapter implements AdapterInstance {
    abstract readonly provider: string;
    abstract readonly model: string;
    supports(feature: AdapterFeature): boolean;
    protected supportedFeatures(): AdapterFeature[];
    abstract run(messages: Message[], config: AdapterRunConfig): Promise<AdapterResult>;
    abstract stream(messages: Message[], config: AdapterRunConfig): AsyncGenerator<StreamChunk>;
    protected mergeUsage(a: Partial<TokenUsage>, b: Partial<TokenUsage>): TokenUsage;
}
//# sourceMappingURL=base.d.ts.map