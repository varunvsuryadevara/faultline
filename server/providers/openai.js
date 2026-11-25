import { AnalysisError } from '../../shared/errors.js';
import { jsonOnlyInstructions } from '../../shared/prompt.js';
import { postJson, providerError, readSSE } from './http.js';

// Any OpenAI-compatible Chat Completions API: OpenAI, Google Gemini, Groq, OpenRouter, Ollama…
// These can't all enforce a JSON Schema, so we ask for JSON mode, put the schema in the prompt,
// and let the shared normaliser repair whatever comes back.
const VARS = { key: 'OPENAI_API_KEY', model: 'OPENAI_MODEL' };

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

const KNOWN = [
  { match: /(^|\.)openai\.com$/, name: 'OpenAI', model: 'gpt-5.4-mini' },
  { match: /generativelanguage\.googleapis\.com$/, name: 'Gemini', model: 'gemini-3.8-flash' },
  { match: /(^|\.)groq\.com$/, name: 'Groq', model: '' },
  { match: /(^|\.)openrouter\.ai$/, name: 'OpenRouter', model: '' },
];

export function createOpenAIProvider(env) {
  const baseUrl = (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').trim().replace(/\/+$/, '');
  const apiKey = (env.OPENAI_API_KEY || '').trim();
  const host = hostOf(baseUrl);
  const local = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(host);
  const known = KNOWN.find((k) => k.match.test(host));
  const name = known?.name ?? (local ? 'Local model' : 'OpenAI-compatible API');
  const model = (env.OPENAI_MODEL || '').trim() || known?.model || '';

  return {
    id: 'openai',
    name,
    model: model || '(set OPENAI_MODEL)',
    configured: (apiKey.length > 0 || local) && model.length > 0,
    setupHint: model
      ? 'Add OPENAI_API_KEY to the .env file in the project folder and save it. No restart needed.'
      : 'Set OPENAI_MODEL (and OPENAI_API_KEY) in the .env file in the project folder and save it. No restart needed.',

    async stream({ system, user, schema }, { signal, onText, onThinking } = {}) {
      const body = {
        model,
        stream: true,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system + jsonOnlyInstructions(schema) },
          { role: 'user', content: user },
        ],
      };
      const headers = apiKey ? { authorization: `Bearer ${apiKey}` } : {};
      const url = `${baseUrl}/chat/completions`;

      let res = await postJson(url, { headers, body, signal, providerName: name });
      if (res.status === 400) {
        const detail = await res.text();
        // Some servers don't support JSON mode; the prompt already demands JSON, so retry without it.
        if (!/response_format|json_object|json mode/i.test(detail)) throw providerError(name, 400, detail, VARS);
        delete body.response_format;
        res = await postJson(url, { headers, body, signal, providerName: name });
      }
      if (!res.ok) throw providerError(name, res.status, await res.text(), VARS);

      let text = '';
      let thinking = '';
      let finish = null;
      for await (const { data } of readSSE(res.body, name)) {
        if (data === '[DONE]') break;
        let msg;
        try {
          msg = JSON.parse(data);
        } catch {
          continue;
        }
        if (msg.error) throw providerError(name, 500, JSON.stringify(msg), VARS);
        const choice = msg.choices?.[0];
        const piece = choice?.delta?.content;
        if (typeof piece === 'string' && piece) {
          text += piece;
          onText?.(text);
        }
        const reasoning = choice?.delta?.reasoning_content ?? choice?.delta?.reasoning;
        if (typeof reasoning === 'string' && reasoning) {
          thinking += reasoning;
          onThinking?.(thinking);
        }
        if (choice?.finish_reason) finish = choice.finish_reason;
      }

      if (finish === 'length') {
        throw new AnalysisError('TOO_LONG', 'The findings ran past the output limit. Shorten the exhibits and try again.', {
          status: 422,
        });
      }
      if (finish === 'content_filter') {
        throw new AnalysisError('REFUSED', 'The model declined to analyse these exhibits.', { status: 422 });
      }
      return text;
    },

    async chat({ system, messages = [], maxTokens = 4000 }, { signal, onText } = {}) {
      const formattedMessages = [
        ...(system ? [{ role: 'system', content: system }] : []),
        ...messages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: String(m.content || ''),
        })),
      ];
      const body = {
        model,
        stream: true,
        max_tokens: maxTokens,
        messages: formattedMessages,
      };
      const headers = apiKey ? { authorization: `Bearer ${apiKey}` } : {};
      const url = `${baseUrl}/chat/completions`;

      const res = await postJson(url, { headers, body, signal, providerName: name });
      if (!res.ok) {
        throw providerError(name, res.status, await res.text(), VARS);
      }

      let text = '';
      for await (const { data } of readSSE(res.body, name)) {
        if (data === '[DONE]') break;
        let msg;
        try {
          msg = JSON.parse(data);
        } catch {
          continue;
        }
        const delta = msg.choices?.[0]?.delta?.content;
        if (delta) {
          text += delta;
          onText?.(text);
        }
      }
      return text;
    },
  };
}
