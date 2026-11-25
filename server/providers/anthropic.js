import { AnalysisError } from '../../shared/errors.js';
import { postJson, providerError, readSSE } from './http.js';

// Claude via the Messages API, streamed. Structured outputs (output_config.format) make the
// model's answer valid JSON for our schema; summarised thinking feeds the live progress log.
const API_VERSION = '2026-10-21';
const VARS = { key: 'ANTHROPIC_API_KEY', model: 'ANTHROPIC_MODEL' };

const isOff = (value) => /^(false|0|no|off)$/i.test(String(value ?? '').trim());

export function createAnthropicProvider(env) {
  const apiKey = (env.ANTHROPIC_API_KEY || '').trim();
  const model = (env.ANTHROPIC_MODEL || '').trim() || 'claude-sonnet-5-5';
  const effort = (env.ANTHROPIC_EFFORT || 'medium').trim().toLowerCase();
  const showReasoning = !isOff(env.ANTHROPIC_SHOW_REASONING);
  const baseUrl = (env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').trim().replace(/\/+$/, '');
  const name = 'Claude';

  return {
    id: 'anthropic',
    name,
    model,
    configured: apiKey.length > 0,
    setupHint: 'Add ANTHROPIC_API_KEY to the .env file in the project folder and save it. No restart needed.',

    async stream({ system, user, schema }, { signal, onText, onThinking } = {}) {
      const body = {
        model,
        // Thinking counts toward max_tokens, so leave generous room; only tokens used are billed.
        max_tokens: 32000,
        system,
        messages: [{ role: 'user', content: user }],
        output_config: {
          format: { type: 'json_schema', schema },
          ...(effort && effort !== 'default' ? { effort } : {}),
        },
        ...(showReasoning ? { thinking: { type: 'adaptive', display: 'summarized' } } : {}),
        stream: true,
      };
      const headers = { 'x-api-key': apiKey, 'anthropic-version': API_VERSION };
      const url = `${baseUrl}/v1/messages`;

      let res = await postJson(url, { headers, body, signal, providerName: name });
      if (res.status === 400 && (body.thinking || body.output_config.effort)) {
        const detail = await res.text();
        // Older models reject adaptive thinking or the effort setting: retry once without them.
        if (!/thinking|effort|display|adaptive/i.test(detail)) throw providerError(name, 400, detail, VARS);
        delete body.thinking;
        delete body.output_config.effort;
        res = await postJson(url, { headers, body, signal, providerName: name });
      }
      if (!res.ok) {
        const error = providerError(name, res.status, await res.text(), VARS);
        if (error.code === 'AUTH' && !apiKey.startsWith('sk-ant-')) {
          error.message += ' Claude API keys start with "sk-ant-".';
        }
        throw error;
      }

      let text = '';
      let thinking = '';
      let stopReason = null;
      let finished = false;
      for await (const { data } of readSSE(res.body, name)) {
        let msg;
        try {
          msg = JSON.parse(data);
        } catch {
          continue;
        }
        if (msg.type === 'content_block_delta') {
          const delta = msg.delta;
          if (delta?.type === 'text_delta' && delta.text) {
            text += delta.text;
            onText?.(text);
          } else if (delta?.type === 'thinking_delta' && delta.thinking) {
            thinking += delta.thinking;
            onThinking?.(thinking);
          }
        } else if (msg.type === 'message_delta') {
          stopReason = msg.delta?.stop_reason ?? stopReason;
        } else if (msg.type === 'message_stop') {
          finished = true;
        } else if (msg.type === 'error') {
          const type = msg.error?.type;
          const status = type === 'overloaded_error' ? 529 : type === 'rate_limit_error' ? 429 : 500;
          throw providerError(name, status, JSON.stringify(msg), VARS);
        }
      }

      if (!finished && !stopReason) {
        throw new AnalysisError('INCOMPLETE', 'The connection to Claude dropped before the answer finished. Try again.', {
          status: 502,
          retryable: true,
        });
      }
      if (stopReason === 'refusal') {
        throw new AnalysisError('REFUSED', 'The model declined to analyse these exhibits.', { status: 422 });
      }
      if (stopReason === 'max_tokens') {
        throw new AnalysisError(
          'TOO_LONG',
          'The findings ran past the output limit. Shorten the exhibits or split the case, then try again.',
          { status: 422 },
        );
      }
      return text;
    },

    async chat({ system, messages = [], maxTokens = 4000 }, { signal, onText } = {}) {
      if (!apiKey) {
        throw new AnalysisError('NO_API_KEY', 'Anthropic API key is not configured.', { status: 503 });
      }
      const formattedMessages = messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || ''),
      }));
      if (formattedMessages.length === 0) {
        formattedMessages.push({ role: 'user', content: 'Hello' });
      }
      const body = {
        model,
        max_tokens: maxTokens,
        ...(system ? { system } : {}),
        messages: formattedMessages,
        stream: true,
      };
      const headers = { 'x-api-key': apiKey, 'anthropic-version': API_VERSION };
      const url = `${baseUrl}/v1/messages`;

      const res = await postJson(url, { headers, body, signal, providerName: name });
      if (!res.ok) {
        throw providerError(name, res.status, await res.text(), VARS);
      }

      let text = '';
      for await (const { data } of readSSE(res.body, name)) {
        let msg;
        try {
          msg = JSON.parse(data);
        } catch {
          continue;
        }
        if (msg.type === 'content_block_delta' && msg.delta?.type === 'text_delta' && msg.delta.text) {
          text += msg.delta.text;
          onText?.(text);
        } else if (msg.type === 'error') {
          throw providerError(name, 500, JSON.stringify(msg), VARS);
        }
      }
      return text;
    },
  };
}
