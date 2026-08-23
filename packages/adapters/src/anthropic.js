import Anthropic from '@anthropic-ai/sdk';
import { AgentOSError, DEFAULT_ANTHROPIC_MODEL } from '@agent-os/core';
import { BaseAdapter } from './base.js';
export class AnthropicAdapter extends BaseAdapter {
    provider = 'anthropic';
    model;
    client;
    defaultMaxTokens;
    defaultTemperature;
    constructor(config = {}) {
        super();
        const apiKey = config.apiKey ?? process.env['ANTHROPIC_API_KEY'];
        if (!apiKey) {
            throw AgentOSError.adapterError('anthropic', 'ANTHROPIC_API_KEY is required');
        }
        this.client = new Anthropic({ apiKey });
        this.model = config.model ?? DEFAULT_ANTHROPIC_MODEL;
        this.defaultMaxTokens = config.maxTokens ?? 4096;
        this.defaultTemperature = config.temperature ?? 1.0;
    }
    async run(messages, config) {
        try {
            const response = await this.client.messages.create({
                model: this.model,
                max_tokens: config.maxTokens ?? this.defaultMaxTokens,
                temperature: config.temperature ?? this.defaultTemperature,
                ...(config.systemPrompt !== undefined ? { system: config.systemPrompt } : {}),
                messages: this.formatMessages(messages),
                ...(config.tools && config.tools.length > 0 ? { tools: this.formatTools(config.tools) } : {}),
            });
            const content = response.content
                .filter((b) => b.type === 'text')
                .map((b) => (b.type === 'text' ? b.text : ''))
                .join('');
            const toolCalls = response.content
                .filter((b) => b.type === 'tool_use')
                .map((b) => {
                if (b.type !== 'tool_use')
                    return null;
                return {
                    id: b.id,
                    name: b.name,
                    input: b.input,
                };
            })
                .filter((tc) => tc !== null);
            return {
                content,
                toolCalls,
                stopReason: this.mapStopReason(response.stop_reason),
                usage: {
                    inputTokens: response.usage.input_tokens,
                    outputTokens: response.usage.output_tokens,
                    totalTokens: response.usage.input_tokens + response.usage.output_tokens,
                },
            };
        }
        catch (err) {
            throw AgentOSError.adapterError('anthropic', `API call failed: ${String(err)}`, err);
        }
    }
    async *stream(messages, config) {
        try {
            const stream = await this.client.messages.stream({
                model: this.model,
                max_tokens: config.maxTokens ?? this.defaultMaxTokens,
                temperature: config.temperature ?? this.defaultTemperature,
                ...(config.systemPrompt !== undefined ? { system: config.systemPrompt } : {}),
                messages: this.formatMessages(messages),
                tools: config.tools ? this.formatTools(config.tools) : undefined,
            });
            for await (const event of stream) {
                if (event.type === 'content_block_delta') {
                    if (event.delta.type === 'text_delta') {
                        yield { type: 'text', text: event.delta.text };
                    }
                }
                else if (event.type === 'message_delta' && event.usage) {
                    yield {
                        type: 'usage',
                        usage: {
                            outputTokens: event.usage.output_tokens,
                        },
                    };
                }
                else if (event.type === 'message_stop') {
                    yield { type: 'stop', stopReason: 'end_turn' };
                }
            }
        }
        catch (err) {
            throw AgentOSError.adapterError('anthropic', `Streaming failed: ${String(err)}`, err);
        }
    }
    formatMessages(messages) {
        return messages
            .filter((m) => m.role !== 'tool')
            .map((m) => ({
            role: m.role,
            content: typeof m.content === 'string' ? m.content : String(m.content),
        }));
    }
    formatTools(tools) {
        return tools.map((t) => ({
            name: t.name,
            description: t.description,
            input_schema: {
                type: 'object',
                ...t.inputSchema,
            },
        }));
    }
    mapStopReason(reason) {
        switch (reason) {
            case 'tool_use': return 'tool_use';
            case 'max_tokens': return 'max_tokens';
            case 'stop_sequence': return 'stop_sequence';
            default: return 'end_turn';
        }
    }
}
//# sourceMappingURL=anthropic.js.map