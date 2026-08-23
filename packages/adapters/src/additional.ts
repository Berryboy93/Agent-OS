/**
 * @package @agent-os/adapters
 * Additional LLM provider adapters
 * 
 * Add to packages/adapters/src/
 * Implements the BaseAdapter interface
 */

// ============================================================================
// 1. Google Gemini Adapter (gemini.ts)
// ============================================================================

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import type { BaseAdapter } from './base.js';

export interface GeminiConfig {
  apiKey: string;
  model?: string; // Default: 'gemini-pro'
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
}

/**
 * Google Gemini adapter
 * Supports: gemini-pro, gemini-pro-vision
 */
export class GeminiAdapter implements BaseAdapter {
  private client: GoogleGenerativeAI;
  private config: Required<GeminiConfig>;

  constructor(config: GeminiConfig) {
    if (!config.apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.client = new GoogleGenerativeAI(config.apiKey);
    this.config = {
      model: config.model ?? 'gemini-pro',
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2048,
      topP: config.topP ?? 1,
      topK: config.topK ?? 40,
      apiKey: config.apiKey,
    };
  }

  async generate(prompt: string): Promise<string> {
    const model = this.client.getGenerativeModel({ model: this.config.model });

    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxTokens,
        topP: this.config.topP,
        topK: this.config.topK,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });

    return response.response.text();
  }

  async chat(messages: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<string> {
    const model = this.client.getGenerativeModel({ model: this.config.model });

    const chat = model.startChat({
      history: messages
        .slice(0, -1)
        .map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
    });

    const response = await chat.sendMessage(messages[messages.length - 1]!.content);
    return response.response.text();
  }

  getName(): string {
    return 'gemini';
  }

  getModel(): string {
    return this.config.model;
  }
}

// ============================================================================
// 2. Mistral Adapter (mistral.ts)
// ============================================================================

import { Mistral } from '@mistralai/mistralai';

export interface MistralConfig {
  apiKey: string;
  model?: string; // Default: 'mistral-large-latest'
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
}

/**
 * Mistral AI adapter
 * Supports: mistral-tiny, mistral-small, mistral-medium, mistral-large
 */
export class MistralAdapter implements BaseAdapter {
  private client: Mistral;
  private config: Required<MistralConfig>;

  constructor(config: MistralConfig) {
    if (!config.apiKey) {
      throw new Error('Mistral API key is required');
    }

    this.client = new Mistral({ apiKey: config.apiKey });
    this.config = {
      model: config.model ?? 'mistral-large-latest',
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 1024,
      topP: config.topP ?? 1,
      topK: config.topK ?? 45,
      apiKey: config.apiKey,
    };
  }

  async generate(prompt: string): Promise<string> {
    const response = await this.client.chat.complete({
      model: this.config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      topP: this.config.topP,
    });

    return response.choices[0].message.content || '';
  }

  async chat(messages: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<string> {
    const response = await this.client.chat.complete({
      model: this.config.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    });

    return response.choices[0].message.content || '';
  }

  getName(): string {
    return 'mistral';
  }

  getModel(): string {
    return this.config.model;
  }
}

// ============================================================================
// 3. Cohere Adapter (cohere.ts)
// ============================================================================

import { CohereClient } from 'cohere-ai';

export interface CohereConfig {
  apiKey: string;
  model?: string; // Default: 'command'
  temperature?: number;
  maxTokens?: number;
  p?: number; // nucleus sampling
  k?: number; // top-k
}

/**
 * Cohere adapter
 * Supports: command, command-light, command-nightly
 */
export class CohereAdapter implements BaseAdapter {
  private client: CohereClient;
  private config: Required<CohereConfig>;

  constructor(config: CohereConfig) {
    if (!config.apiKey) {
      throw new Error('Cohere API key is required');
    }

    this.client = new CohereClient({ token: config.apiKey });
    this.config = {
      model: config.model ?? 'command',
      temperature: config.temperature ?? 0.8,
      maxTokens: config.maxTokens ?? 300,
      p: config.p ?? 0.75,
      k: config.k ?? 0,
      apiKey: config.apiKey,
    };
  }

  async generate(prompt: string): Promise<string> {
    const response = await this.client.generate({
      model: this.config.model,
      prompt,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      p: this.config.p,
      k: this.config.k,
    });

    return response.generations[0].text;
  }

  async chat(messages: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<string> {
    // Cohere's chat is via their Coral interface; fallback to generate
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return '';
    return this.generate(lastMessage.content);
  }

  getName(): string {
    return 'cohere';
  }

  getModel(): string {
    return this.config.model;
  }
}

// ============================================================================
// 4. Ollama Adapter (ollama.ts)
// ============================================================================

import fetch from 'node-fetch';

export interface OllamaConfig {
  baseUrl?: string; // Default: http://localhost:11434
  model: string;
  temperature?: number;
  topP?: number;
  topK?: number;
}

/**
 * Ollama adapter (local LLMs)
 * Supports: llama2, mistral, neural-chat, dolphin-mixtral, etc.
 */
export class OllamaAdapter implements BaseAdapter {
  private baseUrl: string;
  private config: Required<OllamaConfig>;

  constructor(config: OllamaConfig) {
    if (!config.model) {
      throw new Error('Model is required for Ollama');
    }

    this.baseUrl = config.baseUrl ?? 'http://localhost:11434';
    this.config = {
      model: config.model,
      temperature: config.temperature ?? 0.7,
      topP: config.topP ?? 0.9,
      topK: config.topK ?? 40,
      baseUrl: this.baseUrl,
    };
  }

  async generate(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        prompt,
        temperature: this.config.temperature,
        top_p: this.config.topP,
        top_k: this.config.topK,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const data = (await response.json()) as { response: string };
    return data.response;
  }

  async chat(messages: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: this.config.temperature,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const data = (await response.json()) as { message: { content: string } };
    return data.message.content;
  }

  getName(): string {
    return 'ollama';
  }

  getModel(): string {
    return this.config.model;
  }
}

// ============================================================================
// 5. Update packages/adapters/src/index.ts
// ============================================================================

/**
 * Add to index.ts:
 * 
 * export { GeminiAdapter, type GeminiConfig } from './gemini';
 * export { MistralAdapter, type MistralConfig } from './mistral';
 * export { CohereAdapter, type CohereConfig } from './cohere';
 * export { OllamaAdapter, type OllamaConfig } from './ollama';
 * 
 * Adapter registry:
 * 
 * import {
 *   AnthropicAdapter,
 *   OpenAIAdapter,
 *   LocalAdapter,
 *   GeminiAdapter,
 *   MistralAdapter,
 *   CohereAdapter,
 *   OllamaAdapter,
 * } from '@agent-os/adapters';
 * 
 * type AdapterType = 'anthropic' | 'openai' | 'local' | 'gemini' | 'mistral' | 'cohere' | 'ollama';
 * 
 * export function createAdapter(type: AdapterType, config: any) {
 *   switch (type) {
 *     case 'anthropic':
 *       return new AnthropicAdapter(config);
 *     case 'openai':
 *       return new OpenAIAdapter(config);
 *     case 'gemini':
 *       return new GeminiAdapter(config);
 *     case 'mistral':
 *       return new MistralAdapter(config);
 *     case 'cohere':
 *       return new CohereAdapter(config);
 *     case 'ollama':
 *       return new OllamaAdapter(config);
 *     case 'local':
 *     default:
 *       return new LocalAdapter(config);
 *   }
 * }
 */

// ============================================================================
// 6. Package Dependencies
// ============================================================================

/**
 * Add to packages/adapters/package.json:
 * 
 * "dependencies": {
 *   "@google/generative-ai": "^0.3.0",
 *   "@mistralai/mistralai": "^0.0.12",
 *   "cohere-ai": "^7.0.0",
 *   "node-fetch": "^3.3.0"
 * }
 * 
 * These are optional - they're loaded only when their adapters are used.
 */

export {};
