import { createAnthropicProvider } from './anthropic.js';
import { createOpenAIProvider } from './openai.js';
import { createLocalProvider, detectLocalEndpoints } from './local.js';

export { createLocalProvider, detectLocalEndpoints };

// Reads .env-backed settings at call time, so the provider always reflects the current config.
// Supports: 'anthropic', 'openai', 'openai-compatible', 'local', 'ollama', 'lm-studio'
export function getProvider(env = process.env, options = {}) {
  const choice = (options.provider || env.LLM_PROVIDER || 'anthropic').trim().toLowerCase();

  if (choice === 'local' || choice === 'ollama' || choice === 'lm-studio') {
    return createLocalProvider(env, { providerType: choice === 'lm-studio' ? 'openai-compatible' : 'ollama', ...options });
  }

  if (choice === 'openai' || choice === 'openai-compatible') {
    return createOpenAIProvider(env);
  }

  return createAnthropicProvider(env);
}
