import { AgentOSError } from '@agent-os/core';
import { BaseAdapter } from './base.js';
import { OpenAIAdapter } from './openai.js';
export class LocalAdapter extends BaseAdapter {
    provider = 'local';
    model;
    delegate;
    constructor(config = {}) {
        super();
        const baseURL = config.baseURL ?? process.env['LOCAL_LLM_URL'] ?? 'http://localhost:11434/v1';
        const model = config.model ?? process.env['LOCAL_LLM_MODEL'] ?? 'mistral';
        this.model = model;
        try {
            const oaiConfig = {
                apiKey: config.apiKey ?? process.env['LOCAL_LLM_API_KEY'] ?? 'local',
                model,
                baseURL,
            };
            if (config.maxTokens !== undefined)
                oaiConfig.maxTokens = config.maxTokens;
            if (config.temperature !== undefined)
                oaiConfig.temperature = config.temperature;
            this.delegate = new OpenAIAdapter(oaiConfig);
        }
        catch {
            throw AgentOSError.adapterError('local', 'Could not initialize local adapter. Ensure LOCAL_LLM_URL and LOCAL_LLM_MODEL are set.');
        }
    }
    supportedFeatures() {
        return ['streaming'];
    }
    async run(messages, config) {
        try {
            return await this.delegate.run(messages, config);
        }
        catch (err) {
            throw AgentOSError.adapterError('local', `Local LLM call failed: ${String(err)}`, err);
        }
    }
    async *stream(messages, config) {
        try {
            yield* this.delegate.stream(messages, config);
        }
        catch (err) {
            throw AgentOSError.adapterError('local', `Local LLM stream failed: ${String(err)}`, err);
        }
    }
}
//# sourceMappingURL=local.js.map