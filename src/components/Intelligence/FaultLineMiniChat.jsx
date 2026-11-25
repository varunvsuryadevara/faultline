import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  X,
  Maximize2,
  Send,
  RotateCcw,
  Clock,
  Zap,
  Scale,
  Database,
  FileText,
  AlertCircle,
  CheckCircle2,
  Shield,
  User,
  Bot,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { FaultLineCompanionIcon } from '../Companion/FaultLineCloudCompanion.jsx';

export default function FaultLineMiniChat({
  open = false,
  onClose = () => {},
  currentView = 'landing',
  activeCaseId = null,
  caseFile = null,
  statusInfo = null,
  onOpenFullIntelligence = null,
  onThinkingChange = null,
}) {
  const [messages, setMessages] = useState([
    {
      id: 'mini-welcome',
      role: 'assistant',
      content:
        `Hello! I'm your **FaultLine Chatbot** quick assistant.\n\n` +
        `Ask me anything about claims investigations, evidence corroboration, contradiction audits, or motor insurance regulations.`,
      sources: ['NATIVE INTELLIGENCE'],
      routingOutcome: 'OUTCOME_A_INTERNAL',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(() => `mini-conv-${Date.now().toString(36)}`);
  const [activeCase, setActiveCase] = useState(activeCaseId);
  const [expandedSourceIndex, setExpandedSourceIndex] = useState(null);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const chatWindowRef = useRef(null);

  // Sync activeCaseId when current dossier changes
  useEffect(() => {
    if (activeCaseId) {
      setActiveCase(activeCaseId);
    }
  }, [activeCaseId]);

  // Sync thinking state with global companion
  useEffect(() => {
    onThinkingChange?.(loading);
  }, [loading, onThinkingChange]);

  // Auto-scroll on new messages or loading change
  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, open]);

  // Focus textarea when opened
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Send message using existing /api/intelligence/chat endpoint
  const sendMessage = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    setInput('');
    const userMsgId = `usr-${Date.now()}`;
    const userMsg = {
      id: userMsgId,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/intelligence/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          conversationId,
          activeCaseId: activeCase,
          caseFile: caseFile,
          forceOffline: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server error occurred.');
      }

      const assistantMsg = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: data.text,
        sources: data.sources || ['NATIVE INTELLIGENCE'],
        routingOutcome: data.routingOutcome || 'OUTCOME_A_INTERNAL',
        durationMs: data.durationMs || 0,
        processingMode: data.processingMode || 'OFFLINE_NATIVE',
        usedLocalAI: data.usedLocalAI || false,
        escalatedToClaude: data.escalatedToClaude || false,
        tokens: data.tokens || null,
        validation: data.validation || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (data.activeCaseId) {
        setActiveCase(data.activeCaseId);
      }

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠ **Request Failed:** ${err.message}\n\nPlease try again or rephrase your question.`,
          sources: ['ERROR FALLBACK'],
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    try {
      await fetch(`/api/intelligence/conversations/${conversationId}/clear`, { method: 'POST' });
    } catch {}
    const newId = `mini-conv-${Date.now().toString(36)}`;
    setConversationId(newId);
    setMessages([
      {
        id: 'new-conv',
        role: 'assistant',
        content: `Conversation reset. Active investigation: **${activeCase || caseFile?.title || 'None selected'}**. How can I help you?`,
        sources: ['NATIVE INTELLIGENCE'],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderSourceBadge = (source) => {
    if (source.includes('CLAUDE')) {
      return (
        <span key={source} className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.2 text-[9.5px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <Sparkles className="size-2.5" /> CLAUDE
        </span>
      );
    }
    if (source.includes('TIMELINE')) {
      return (
        <span key={source} className="inline-flex items-center gap-1 rounded bg-cyan-500/10 px-1.5 py-0.2 text-[9.5px] font-semibold text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
          <Clock className="size-2.5" /> TIMELINE
        </span>
      );
    }
    if (source.includes('CONTRADICTION')) {
      return (
        <span key={source} className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-1.5 py-0.2 text-[9.5px] font-semibold text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <AlertCircle className="size-2.5" /> CONFLICT
        </span>
      );
    }
    if (source.includes('CORROBORATION')) {
      return (
        <span key={source} className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.2 text-[9.5px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="size-2.5" /> CORROBORATION
        </span>
      );
    }
    return (
      <span key={source} className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.2 text-[9.5px] font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/20">
        <Zap className="size-2.5" /> NATIVE
      </span>
    );
  };

  // Quick suggestion chips based on current page context
  const suggestionChips = activeCase || caseFile
    ? [
        'Find contradictions in evidence',
        'Check independent corroborations',
        'Reconstruct the incident timeline',
        'What motor regulations apply?',
      ]
    : [
        'How many investigations are in the library?',
        'What are the motor insurance rules in UK?',
        'What evidence file formats are supported?',
        'How does FaultLine verify fraud?',
      ];

  const hasActiveCase = Boolean(caseFile?.title?.trim() || (activeCase && activeCase !== 'null' && activeCase !== 'undefined'));
  const caseTitle = caseFile?.title?.trim() || activeCase;

  if (!open) return null;

  return (
    <aside
      ref={chatWindowRef}
      role="dialog"
      aria-label="FaultLine Chatbot Quick Chat"
      className="fixed inset-x-3 bottom-3 top-16 sm:top-auto sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[410px] sm:h-[590px] sm:max-h-[85vh] z-50 rounded-2xl border border-rule/80 dark:border-blue-500/25 bg-sheet/95 dark:bg-[#0B1220]/95 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 select-text"
    >
      {/* 1. Top Header Bar */}
      <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-rule/70 bg-sheet/90 dark:bg-[#0B1220]/90 px-3.5 py-2.5 backdrop-blur-xs shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
            <FaultLineCompanionIcon className="size-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-[13.5px] font-bold tracking-tight text-ink truncate">
                FaultLine Chatbot
              </h2>
              <span className="rounded-full bg-blue-500/10 px-1.5 py-0.2 text-[9px] font-bold text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase shrink-0">
                AI
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10.5px] text-ink-3">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{statusInfo?.provider?.configured ? 'Claude Hybrid' : 'Native Offline Engine'}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {onOpenFullIntelligence && (
            <button
              type="button"
              onClick={onOpenFullIntelligence}
              className="rounded-lg p-1.5 text-ink-3 hover:text-ink hover:bg-hover transition-colors"
              title="Expand to full Intelligence workspace"
              aria-label="Expand to full Intelligence workspace"
            >
              <Maximize2 className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={handleClearChat}
            className="rounded-lg p-1.5 text-ink-3 hover:text-ink hover:bg-hover transition-colors"
            title="Reset conversation"
            aria-label="Reset conversation"
          >
            <RotateCcw className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-3 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            title="Close mini chat (Esc)"
            aria-label="Close mini chat"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      {/* 2. Context Badge Strip (Section 8: Page Context Awareness) */}
      <div className="shrink-0 px-3.5 py-1 bg-pen-wash/60 dark:bg-pen/10 border-b border-rule/50 flex items-center justify-between text-[11px] text-ink-2">
        <span className="truncate flex items-center gap-1.5 font-medium">
          {hasActiveCase ? (
            <>
              <Scale className="size-3 text-pen shrink-0" />
              <span className="truncate">Case Context: <strong>{caseTitle}</strong></span>
            </>
          ) : currentView === 'library' || currentView === 'scenario' ? (
            <>
              <Database className="size-3 text-pen shrink-0" />
              <span>Scenario Library (266 Claims)</span>
            </>
          ) : currentView === 'legal-library' || currentView === 'regulations' ? (
            <>
              <FileText className="size-3 text-pen shrink-0" />
              <span>Legal &amp; Regulatory Statutes</span>
            </>
          ) : (
            <>
              <Sparkles className="size-3 text-blue-500 shrink-0" />
              <span>Active Investigation Assistant</span>
            </>
          )}
        </span>
      </div>

      {/* 3. Messages Stream */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 scrollbar-thin">
        {messages.map((m, idx) => (
          <div
            key={m.id || idx}
            className={`flex items-start gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {m.role === 'assistant' ? (
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <FaultLineCompanionIcon className="size-4" />
              </div>
            ) : (
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-hover text-ink shadow-2xs border border-rule">
                <User className="size-3.5" />
              </div>
            )}

            <div
              className={`max-w-[84%] rounded-xl px-3 py-2 text-[12.5px] shadow-2xs ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : m.isError
                  ? 'border border-red-500/30 bg-red-500/10 text-ink'
                  : 'border border-rule/70 bg-sheet/95 text-ink'
              }`}
            >
              {/* Source Tags */}
              {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                <div className="mb-1.5 flex flex-wrap items-center gap-1 border-b border-rule/50 pb-1.5">
                  {m.sources.map((s) => renderSourceBadge(s))}
                  {m.durationMs !== undefined && m.durationMs > 0 && (
                    <span className="text-[9.5px] text-ink-3 ml-auto flex items-center gap-0.5">
                      <Clock className="size-2.5" /> {m.durationMs}ms
                    </span>
                  )}
                </div>
              )}

              {/* Message Content */}
              <div className="whitespace-pre-wrap leading-relaxed font-sans">
                {m.content}
              </div>

              {/* Forensic Metadata Accordion */}
              {m.role === 'assistant' && (m.routingOutcome || m.validation) && (
                <div className="mt-2 pt-1.5 border-t border-rule/40">
                  <button
                    type="button"
                    onClick={() => setExpandedSourceIndex(expandedSourceIndex === idx ? null : idx)}
                    className="flex items-center gap-1 text-[10px] font-medium text-ink-3 hover:text-ink transition-colors"
                  >
                    {expandedSourceIndex === idx ? <ChevronUp className="size-2.5" /> : <ChevronDown className="size-2.5" />}
                    <span>Forensic Details</span>
                  </button>
                  {expandedSourceIndex === idx && (
                    <div className="mt-1.5 rounded-md border border-rule bg-paper/80 p-2 text-[10px] text-ink-2 space-y-1">
                      <div>Outcome: <code className="text-blue-500 font-mono">{m.routingOutcome}</code></div>
                      <div>Claude: {m.escalatedToClaude ? 'Yes' : 'Native Deterministic Engine'}</div>
                      {m.validation && m.validation.exhibitsVerified?.length > 0 && (
                        <div>Verified Exhibits: {m.validation.exhibitsVerified.join(', ')}</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className={`mt-1 text-right text-[9px] ${m.role === 'user' ? 'text-blue-200' : 'text-ink-3'}`}>
                {m.timestamp}
              </div>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-start gap-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 animate-pulse">
              <FaultLineCompanionIcon className="size-4" />
            </div>
            <div className="rounded-xl border border-rule/70 bg-sheet/95 px-3 py-2 text-[12px] text-ink-2 shadow-2xs flex items-center gap-2">
              <span className="flex gap-1">
                <span className="size-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="size-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="size-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              <span className="text-ink-3">Analyzing evidence &amp; regulations...</span>
            </div>
          </div>
        )}

        {/* Suggestion Chips when conversation is short */}
        {messages.length <= 1 && !loading && (
          <div className="pt-2">
            <span className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider block mb-1.5">
              Suggested Questions
            </span>
            <div className="flex flex-col gap-1.5">
              {suggestionChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => sendMessage(chip)}
                  className="rounded-lg border border-rule/70 bg-sheet/70 hover:bg-hover hover:border-pen/50 px-2.5 py-1.5 text-left text-[11.5px] font-medium text-ink-2 hover:text-ink transition-colors flex items-center justify-between group"
                >
                  <span>{chip}</span>
                  <span className="text-pen opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* 4. Bottom Input Bar */}
      <footer className="shrink-0 border-t border-rule/70 bg-sheet/95 dark:bg-[#0B1220]/95 p-2.5 backdrop-blur-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-center gap-2"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              hasActiveCase
                ? `Ask about ${caseTitle}...`
                : 'Ask FaultLine Chatbot...'
            }
            disabled={loading}
            className="flex-1 max-h-24 resize-none rounded-xl border border-rule bg-paper px-3 py-2 text-[12.5px] text-ink placeholder:text-ink-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-all duration-150 hover:bg-blue-700 disabled:opacity-35 disabled:hover:bg-blue-600 active:scale-95 shadow-2xs"
            title="Send message (Enter)"
            aria-label="Send message"
          >
            <Send className="size-3.5" />
          </button>
        </form>
        <div className="mt-1 flex items-center justify-between text-[10px] text-ink-3 px-1">
          <span>Enter to send • Shift+Enter for newline</span>
          <span>Esc to close</span>
        </div>
      </footer>
    </aside>
  );
}
