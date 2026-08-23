import type { AdapterRunConfig, AdapterResult, AdapterFeature, Message, StreamChunk } from '@agent-os/core';
import { BaseAdapter } from './base.js';
export interface LocalAdapterConfig {
    baseURL?: string;
    model?: string;
    apiKey?: string;
    maxTokens?: number;
    temperature?: number;
}
export declare class LocalAdapter extends BaseAdapter {
    readonly provider = "local";
    readonly model: string;
    private readonly delegate;
    constructor(config?: LocalAdapterConfig);
    protected supportedFeatures(): AdapterFeature[];
    run(messages: Message[], config: AdapterRunConfig): Promise<AdapterResult>;
    stream(messages: Message[], config: AdapterRunConfig): AsyncGenerator<StreamChunk>;
}
//# sourceMappingURL=local.d.ts.map