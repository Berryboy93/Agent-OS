import { AgentOSError } from '@agent-os/core';
import { BaseAdapter } from './base.js';
export class OpenAIAdapter extends BaseAdapter {
    provider = 'openai';
    model;
    apiKey;
    baseURL;
    defaultMaxTokens;
    defaultTemperature;
    constructor(config = {}) {
        super();
        const apiKey = config.apiKey ?? process.env['OPENAI_API_KEY'];
        if (!apiKey) {
            throw AgentOSError.adapterError('openai', 'OPENAI_API_KEY is required');
        }
        this.apiKey = apiKey;
        this.model = config.model ?? 'gpt-4o';
        this.baseURL = config.baseURL ?? 'https://api.openai.com/v1';
        this.defaultMaxTokens = config.maxTokens ?? 4096;
        this.defaultTemperature = config.temperature ?? 1.0;
    }
    supportedFeatures() {
        return ['streaming', 'tools', 'vision', 'json_mode'];
    }
    async run(messages, config) {
        const body = {
            model: this.model,
            max_tokens: config.maxTokens ?? this.defaultMaxTokens,
            temperature: config.temperature ?? this.defaultTemperature,
            messages: this.formatMessages(messages, config.systemPrompt),
        };
        if (config.tools && config.tools.length > 0) {
            body['tools'] = this.formatTools(config.tools);
        }
        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`OpenAI API error ${response.status}: ${text}`);
            }
            const data = (await response.json());
            const choice = data.choices[0];
            if (!choice)
                throw new Error('No choices in response');
            const content = choice.message.content ?? '';
            const toolCalls = (choice.message.tool_calls ?? []).map((tc) => ({
                id: tc.id,
                name: tc.function.name,
                input: JSON.parse(tc.function.arguments),
            }));
            return {
                content,
                toolCalls,
                stopReason: this.mapStopReason(choice.finish_reason),
                usage: {
                    inputTokens: data.usage.prompt_tokens,
                    outputTokens: data.usage.completion_tokens,
                    totalTokens: data.usage.total_tokens,
                },
            };
        }
        catch (err) {
            throw AgentOSError.adapterError('openai', `API call failed: ${String(err)}`, err);
        }
    }
    async *stream(messages, config) {
        const body = {
            model: this.model,
            max_tokens: config.maxTokens ?? this.defaultMaxTokens,
            temperature: config.temperature ?? this.defaultTemperature,
            messages: this.formatMessages(messages, config.systemPrompt),
            stream: true,
        };
        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify(body),
            });
            if (!response.ok || !response.body) {
                throw new Error(`OpenAI streaming error: ${response.status}`);
            }
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';
                for (const line of lines) {
                    if (!line.startsWith('data: '))
                        continue;
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') {
                        yield { type: 'stop', stopReason: 'end_turn' };
                        return;
                    }
                    try {
                        const chunk = JSON.parse(data);
                        const delta = chunk.choices[0]?.delta;
                        if (delta?.content)
                            yield { type: 'text', text: delta.content };
                    }
                    catch { /* skip malformed */ }
                }
            }
        }
        catch (err) {
            throw AgentOSError.adapterError('openai', `Streaming failed: ${String(err)}`, err);
        }
    }
    formatMessages(messages, systemPrompt) {
        const result = [];
        if (systemPrompt)
            result.push({ role: 'system', content: systemPrompt });
        for (const m of messages) {
            if (m.role === 'tool') {
                result.push({ role: 'tool', content: m.content, tool_call_id: m.toolCallId ?? 'unknown' });
            }
            else {
                result.push({ role: m.role, content: m.content });
            }
        }
        return result;
    }
    formatTools(tools) {
        return tools.map((t) => ({
            type: 'function',
            function: {
                name: t.name,
                description: t.description,
                parameters: { type: 'object', ...t.inputSchema },
            },
        }));
    }
    mapStopReason(reason) {
        switch (reason) {
            case 'tool_calls': return 'tool_use';
            case 'length': return 'max_tokens';
            case 'stop': return 'end_turn';
            default: return 'end_turn';
        }
    }
}
//# sourceMappingURL=openai.js.map