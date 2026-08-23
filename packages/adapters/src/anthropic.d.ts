import type { AdapterRunConfig, AdapterResult, Message, StreamChunk } from '@agent-os/core';
import { BaseAdapter } from './base.js';
export interface AnthropicAdapterConfig {
    apiKey?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
}
export declare class AnthropicAdapter extends BaseAdapter {
    readonly provider = "anthropic";
    readonly model: string;
    private readonly client;
    private readonly defaultMaxTokens;
    private readonly defaultTemperature;
    constructor(config?: AnthropicAdapterConfig);
    run(messages: Message[], config: AdapterRunConfig): Promise<AdapterResult>;
    stream(messages: Message[], config: AdapterRunConfig): AsyncGenerator<StreamChunk>;
    private formatMessages;
    private formatTools;
    private mapStopReason;
}
//# sourceMappingURL=anthropic.d.ts.map