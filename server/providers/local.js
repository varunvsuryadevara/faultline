// Local AI Provider Adapter for FaultLine.
// Implements unified provider interface for Ollama, LM Studio, llama.cpp, and local OpenAI-compatible inference servers.
// 100% Offline Capable: Zero cloud data egress, strictly operates on localhost/internal network.

import { AnalysisError, isAbortError } from '../../shared/errors.js';
import { postJson, readSSE } from './http.js';

export const LOCAL_AI_DEFAULT_URLS = [
  process.env.LOCAL_AI_BASE_URL,
  process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
  'http://127.0.0.1:1234', // LM Studio / standard local OpenAI port
  'http://127.0.0.1:8080', // llama.cpp server
].filter(Boolean);

let cachedDetection = null;
let lastDetectionTime = 0;
const DETECTION_CACHE_TTL = 15000; // 15 seconds cache

/**
 * Detects available local AI services (Ollama, LM Studio, llama.cpp).
 */
export async function detectLocalEndpoints(forceCheck = false) {
  const now = Date.now();
  if (!forceCheck && cachedDetection && (now - lastDetectionTime < DETECTION_CACHE_TTL)) {
    return cachedDetection;
  }

  for (const baseUrl of LOCAL_AI_DEFAULT_URLS) {
    try {
      // 1. Check Ollama tags
      if (baseUrl.includes('11434') || baseUrl.includes('ollama')) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1200);
        const res = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal }).catch(() => null);
        clearTimeout(timeout);

        if (res && res.ok) {
          const data = await res.json().catch(() => ({}));
          const models = (data.models || []).map((m) => m.name || m.model);
          cachedDetection = {
            available: true,
            providerId: 'ollama',
            name: 'Ollama Local AI',
            baseUrl,
            models,
            defaultModel: models[0] || 'llama3.2:latest',
            isLocal: true,
          };
          lastDetectionTime = now;
          return cachedDetection;
        }
      }

      // 2. Check OpenAI-compatible /v1/models (LM Studio, llama.cpp, vLLM)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${baseUrl}/v1/models`, { signal: controller.signal }).catch(() => null);
      clearTimeout(timeout);

      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        const models = (data.data || []).map((m) => m.id);
        const isLMStudio = baseUrl.includes('1234');
        cachedDetection = {
          available: true,
          providerId: isLMStudio ? 'lm-studio' : 'local-openai',
          name: isLMStudio ? 'LM Studio (Local)' : 'Local OpenAI Server',
          baseUrl,
          models,
          defaultModel: models[0] || 'local-model',
          isLocal: true,
        };
        lastDetectionTime = now;
        return cachedDetection;
      }
    } catch {
      // Ignore individual port connection timeouts
    }
  }

  cachedDetection = {
    available: false,
    providerId: 'none',
    name: 'Local AI Not Connected',
    baseUrl: null,
    models: [],
    defaultModel: null,
    isLocal: true,
    reason: 'No active local AI endpoint detected on localhost:11434, 1234, or 8080.',
  };
  lastDetectionTime = now;
  return cachedDetection;
}

/**
 * Creates a Local Provider instance adhering to FaultLine's unified provider interface.
 */
export function createLocalProvider(env = process.env, options = {}) {
  const baseUrl = options.baseUrl || env.LOCAL_AI_BASE_URL || (env.OLLAMA_HOST || 'http://127.0.0.1:11434');
  const model = options.model || env.LOCAL_AI_MODEL || env.OLLAMA_MODEL || 'llama3.2';
  const providerType = options.providerType || (baseUrl.includes('11434') ? 'ollama' : 'openai-compatible');
  const name = providerType === 'ollama' ? 'Ollama (Local)' : 'LM Studio (Local)';

  return {
    id: providerType === 'ollama' ? 'ollama' : 'lm-studio',
    name,
    model,
    baseUrl,
    isLocal: true,
    configured: Boolean(baseUrl),
    setupHint: 'Start Ollama (ollama serve) or LM Studio local server on 127.0.0.1:11434 or 1234.',

    /**
     * Executes non-streaming chat completion.
     */
    async chat({ system, messages = [], maxTokens = 4000, temperature = 0.2 }, { signal, onText } = {}) {
      const formattedMessages = [
        ...(system ? [{ role: 'system', content: system }] : []),
        ...messages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: String(m.content || ''),
        })),
      ];

      if (formattedMessages.length === 0) {
        formattedMessages.push({ role: 'user', content: 'Hello' });
      }

      if (providerType === 'ollama') {
        const body = {
          model,
          messages: formattedMessages,
          stream: false,
          options: {
            temperature,
            num_predict: maxTokens,
          },
        };

        const res = await postJson(`${baseUrl}/api/chat`, {
          headers: { 'Content-Type': 'application/json' },
          body,
          signal,
          providerName: name,
        });

        if (!res.ok) {
          throw new AnalysisError('PROVIDER_ERROR', `Ollama returned HTTP ${res.status}: ${await res.text()}`, { status: res.status });
        }

        const data = await res.json();
        const text = data.message?.content || '';
        onText?.(text);
        return text;
      } else {
        // OpenAI-compatible format
        const body = {
          model,
          messages: formattedMessages,
          stream: false,
          max_tokens: maxTokens,
          temperature,
        };

        const res = await postJson(`${baseUrl}/v1/chat/completions`, {
          headers: { 'Content-Type': 'application/json' },
          body,
          signal,
          providerName: name,
        });

        if (!res.ok) {
          throw new AnalysisError('PROVIDER_ERROR', `Local endpoint returned HTTP ${res.status}: ${await res.text()}`, { status: res.status });
        }

        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '';
        onText?.(text);
        return text;
      }
    },

    /**
     * Executes real-time streaming chat completion.
     */
    async stream({ system, user, messages = [], schema }, { signal, onText, onThinking } = {}) {
      const allMessages = messages.length > 0
        ? [
            ...(system ? [{ role: 'system', content: system }] : []),
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ]
        : [
            ...(system ? [{ role: 'system', content: system }] : []),
            { role: 'user', content: user || '' },
          ];

      if (providerType === 'ollama') {
        const body = {
          model,
          messages: allMessages,
          stream: true,
          options: { temperature: 0.2 },
        };

        const res = await postJson(`${baseUrl}/api/chat`, {
          headers: { 'Content-Type': 'application/json' },
          body,
          signal,
          providerName: name,
        });

        if (!res.ok) {
          throw new AnalysisError('PROVIDER_ERROR', `Ollama stream error: ${res.status}`, { status: res.status });
        }

        let fullText = '';
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              const chunk = parsed.message?.content || '';
              if (chunk) {
                fullText += chunk;
                onText?.(fullText);
              }
            } catch {
              // ignore partial lines
            }
          }
        }
        return fullText;
      } else {
        // OpenAI-compatible SSE streaming
        const body = {
          model,
          messages: allMessages,
          stream: true,
        };

        const res = await postJson(`${baseUrl}/v1/chat/completions`, {
          headers: { 'Content-Type': 'application/json' },
          body,
          signal,
          providerName: name,
        });

        if (!res.ok) {
          throw new AnalysisError('PROVIDER_ERROR', `Local stream error: ${res.status}`, { status: res.status });
        }

        let fullText = '';
        for await (const { data } of readSSE(res.body, name)) {
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            const chunk = parsed.choices?.[0]?.delta?.content;
            if (chunk) {
              fullText += chunk;
              onText?.(fullText);
            }
          } catch {
            // ignore
          }
        }
        return fullText;
      }
    },
  };
}
