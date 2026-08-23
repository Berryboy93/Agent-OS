import type { AdapterRunConfig, AdapterResult, AdapterFeature, Message, StreamChunk } from '@agent-os/core';
import { BaseAdapter } from './base.js';
export interface OpenAIAdapterConfig {
    apiKey?: string;
    model?: string;
    baseURL?: string;
    maxTokens?: number;
    temperature?: number;
}
export declare class OpenAIAdapter extends BaseAdapter {
    readonly provider = "openai";
    readonly model: string;
    private readonly apiKey;
    private readonly baseURL;
    private readonly defaultMaxTokens;
    private readonly defaultTemperature;
    constructor(config?: OpenAIAdapterConfig);
    protected supportedFeatures(): AdapterFeature[];
    run(messages: Message[], config: AdapterRunConfig): Promise<AdapterResult>;
    stream(messages: Message[], config: AdapterRunConfig): AsyncGenerator<StreamChunk>;
    private formatMessages;
    private formatTools;
    private mapStopReason;
}
//# sourceMappingURL=openai.d.ts.map