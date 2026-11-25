// Local AI Provider Adapter for FaultLine (Layer B: Local AI Engine).
// Supports Ollama, LM Studio, llama.cpp, and local OpenAI-compatible inference servers.
// 100% Offline Capable: Gracefully detects availability and operates with zero cloud data egress.

import { createLocalProvider, detectLocalEndpoints, LOCAL_AI_DEFAULT_URLS } from '../providers/local.js';

export { LOCAL_AI_DEFAULT_URLS };

/**
 * Detects whether any local AI inference server is running and reachable.
 */
export async function detectLocalAI(forceCheck = false) {
  const detected = await detectLocalEndpoints(forceCheck);
  return {
    available: detected.available,
    provider: detected.providerId,
    name: detected.name,
    baseUrl: detected.baseUrl,
    models: detected.models,
    defaultModel: detected.defaultModel,
    isLocal: true,
    reason: detected.reason || null,
  };
}

/**
 * Executes inference on local AI model with fallback protection and structured outputs.
 */
export async function queryLocalAI({
  prompt,
  systemPrompt = 'You are FaultLine Local AI, an insurance forensic assistant. Keep answers factual, concise, and grounded strictly in the provided evidence. Always reference exact exhibits (Exhibit A, Exhibit B).',
  temperature = 0.2,
  model = null,
  signal = null,
  conversationHistory = [],
}) {
  const status = await detectLocalAI();
  if (!status.available) {
    return {
      success: false,
      error: 'LOCAL_AI_UNAVAILABLE',
      message: status.reason || 'No active local AI endpoint detected on localhost.',
    };
  }

  try {
    const selectedModel = model || status.defaultModel;
    const provider = createLocalProvider(process.env, {
      baseUrl: status.baseUrl,
      model: selectedModel,
      providerType: status.provider === 'ollama' ? 'ollama' : 'openai-compatible',
    });

    const messages = [
      ...conversationHistory.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.text || m.content || '',
      })),
      { role: 'user', content: prompt },
    ];

    const responseText = await provider.chat(
      {
        system: systemPrompt,
        messages,
        maxTokens: 2500,
        temperature,
      },
      { signal }
    );

    return {
      success: true,
      text: responseText,
      model: selectedModel,
      provider: status.provider,
      providerName: status.name,
      isLocal: true,
    };
  } catch (err) {
    return {
      success: false,
      error: err.name === 'AbortError' ? 'TIMEOUT' : 'CONNECTION_ERROR',
      message: err.message,
    };
  }
}
