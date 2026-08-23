import type {
  AdapterInstance,
  AdapterFeature,
  AdapterRunConfig,
  AdapterResult,
  Message,
  StreamChunk,
  TokenUsage,
} from '@agent-os/core';

export abstract class BaseAdapter implements AdapterInstance {
  abstract readonly provider: string;
  abstract readonly model: string;

  supports(feature: AdapterFeature): boolean {
    return this.supportedFeatures().includes(feature);
  }

  protected supportedFeatures(): AdapterFeature[] {
    return [];
  }

  abstract run(messages: Message[], config: AdapterRunConfig): Promise<AdapterResult>;
  abstract stream(messages: Message[], config: AdapterRunConfig): AsyncGenerator<StreamChunk>;

  protected mergeUsage(a: Partial<TokenUsage>, b: Partial<TokenUsage>): TokenUsage {
    return {
      inputTokens: (a.inputTokens ?? 0) + (b.inputTokens ?? 0),
      outputTokens: (a.outputTokens ?? 0) + (b.outputTokens ?? 0),
      totalTokens: (a.totalTokens ?? 0) + (b.totalTokens ?? 0),
    };
  }
}
