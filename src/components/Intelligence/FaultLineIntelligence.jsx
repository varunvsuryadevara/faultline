import { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  RefreshCw,
  Trash2,
  Download,
  BarChart3,
  Scale,
  Shield,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Bot,
  User,
  Zap,
  Info,
  X,
  Sliders,
  Check,
  RotateCcw,
  Cpu,
  History,
  Cloud,
} from 'lucide-react';
import { Button } from '../ui.jsx';
import CodexCompanion, { FaultLineCompanionIcon } from '../Companion/CodexCompanion.jsx';

export default function FaultLineIntelligence({
  activeCaseId = null,
  caseFile = null,
  onNavigateToCase = null,
  onNavigateToLibrary = null,
  onNavigateToLegal = null,
  onThinkingChange = null,
}) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        `Welcome to **FaultLine Chatbot** — your independent, offline-capable motor claims investigation assistant.\n\n` +
        `I operate under FaultLine's strict forensic principle:\n` +
        `**Internal Intelligence First → Internal Database Second → Claude Sonnet Escalation When Necessary.**\n\n` +
        `• **100% Offline Capable:** Deterministic engines for incident timelines, contradiction audits, corroboration verification, fraud typologies, and policy conditions.\n` +
        `• **Governed Intelligence Builder:** Discovers empirical patterns across 266 scenarios and proposes structured improvements subject to human approval.\n\n` +
        `Ask about operational metrics, application guidance, specific claim dossiers, evidence exhibits, or verified motor laws across 20 jurisdictions.`,
      sources: ['INTERNAL INTELLIGENCE', 'NATIVE INTELLIGENCE'],
      routingOutcome: 'OUTCOME_A_INTERNAL',
      durationMs: 1,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync thinking state with global companion
  useEffect(() => {
    onThinkingChange?.(loading);
  }, [loading, onThinkingChange]);
  const [conversationId, setConversationId] = useState(() => `conv-${Date.now().toString(36)}`);
  const [activeCase, setActiveCase] = useState(activeCaseId);
  const [expandedSourceIndex, setExpandedSourceIndex] = useState(null);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminMetrics, setAdminMetrics] = useState(null);
  const [statusInfo, setStatusInfo] = useState(null);
  const [forceOffline, setForceOffline] = useState(false);
  const [showCompanion, setShowCompanion] = useState(() => {
    try {
      return localStorage.getItem('faultline_show_codex') !== 'false';
    } catch {
      return true;
    }
  });
  const [messageSentPulse, setMessageSentPulse] = useState(0);

  // Intelligence Builder Drawer / Modal State
  const [builderModalOpen, setBuilderModalOpen] = useState(false);
  const [builderTab, setBuilderTab] = useState('proposals'); // 'proposals' | 'patterns' | 'rules' | 'audit'
  const [builderProposals, setBuilderProposals] = useState([]);
  const [builderPatterns, setBuilderPatterns] = useState(null);
  const [builderRules, setBuilderRules] = useState([]);
  const [builderAudit, setBuilderAudit] = useState([]);
  const [builderLoading, setBuilderLoading] = useState(false);
  const [builderMessage, setBuilderMessage] = useState(null);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  // Sync activeCaseId prop if changed from outside
  useEffect(() => {
    if (activeCaseId) {
      setActiveCase(activeCaseId);
    }
  }, [activeCaseId]);

  // Load backend status
  const fetchStatus = () => {
    fetch('/api/intelligence/status')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setStatusInfo(data);
      })
      .catch((err) => console.warn('Could not fetch intelligence status:', err));
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fetchAdminMetrics = async () => {
    try {
      const res = await fetch('/api/intelligence/admin/metrics');
      const data = await res.json();
      if (data.ok) setAdminMetrics(data.metrics);
      setAdminModalOpen(true);
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    }
  };

  // Intelligence Builder Data Loader
  const loadBuilderData = async () => {
    setBuilderLoading(true);
    setBuilderMessage(null);
    try {
      const [pRes, patRes, rRes, aRes] = await Promise.all([
        fetch('/api/intelligence/builder/proposals').then((r) => r.json()),
        fetch('/api/intelligence/builder/patterns').then((r) => r.json()),
        fetch('/api/intelligence/builder/rules').then((r) => r.json()),
        fetch('/api/intelligence/builder/audit').then((r) => r.json()),
      ]);

      if (pRes.ok) setBuilderProposals(pRes.proposals || []);
      if (patRes.ok) setBuilderPatterns(patRes);
      if (rRes.ok) setBuilderRules(rRes.activeRules || []);
      if (aRes.ok) setBuilderAudit(aRes.auditHistory || []);
    } catch (err) {
      console.error('Failed to load builder data:', err);
    } finally {
      setBuilderLoading(false);
    }
  };

  const openBuilderModal = () => {
    setBuilderModalOpen(true);
    loadBuilderData();
  };

  const handleValidateProposal = async (id) => {
    try {
      const res = await fetch(`/api/intelligence/builder/proposals/${id}/validate`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setBuilderMessage(`✔ Proposal ${id} validated against 266 benchmarks! Score: ${data.validation.validationScore}% (${data.validation.status})`);
        loadBuilderData();
      } else {
        setBuilderMessage(`⚠ Validation failed: ${data.error}`);
      }
    } catch (err) {
      setBuilderMessage(`⚠ Error: ${err.message}`);
    }
  };

  const handleApproveProposal = async (id) => {
    try {
      const res = await fetch(`/api/intelligence/builder/proposals/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerNotes: 'Approved via FaultLine Intelligence Governance UI', approvedBy: 'Authorized Claims Lead' }),
      });
      const data = await res.json();
      if (data.ok) {
        setBuilderMessage(`✔ Proposal ${id} successfully approved.`);
        loadBuilderData();
      } else {
        setBuilderMessage(`⚠ Approval failed: ${data.error}`);
      }
    } catch (err) {
      setBuilderMessage(`⚠ Error: ${err.message}`);
    }
  };

  const handleActivateRule = async (id) => {
    try {
      const res = await fetch(`/api/intelligence/builder/proposals/${id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: 'Claims Forensics Lead' }),
      });
      const data = await res.json();
      if (data.ok) {
        setBuilderMessage(`✔ Rule ${data.rule.ruleId} (${data.rule.version}) successfully activated into live native engine.`);
        loadBuilderData();
        fetchStatus();
      } else {
        setBuilderMessage(`⚠ Activation failed: ${data.error}`);
      }
    } catch (err) {
      setBuilderMessage(`⚠ Error: ${err.message}`);
    }
  };

  const handleRollbackRule = async (id) => {
    try {
      const res = await fetch(`/api/intelligence/builder/proposals/${id}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Reverted by investigator via Governance UI', user: 'Claims Lead' }),
      });
      const data = await res.json();
      if (data.ok) {
        setBuilderMessage(`✔ Rule ${id} successfully rolled back and removed from active ruleset.`);
        loadBuilderData();
        fetchStatus();
      } else {
        setBuilderMessage(`⚠ Rollback failed: ${data.error}`);
      }
    } catch (err) {
      setBuilderMessage(`⚠ Error: ${err.message}`);
    }
  };

  const handleSend = async (textToSend) => {
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
    setMessageSentPulse((p) => p + 1);

    try {
      const res = await fetch('/api/intelligence/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          conversationId,
          activeCaseId: activeCase,
          caseFile: caseFile,
          forceOffline,
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
    const newId = `conv-${Date.now().toString(36)}`;
    setConversationId(newId);
    setMessages([
      {
        id: 'new-conv',
        role: 'assistant',
        content: `Conversation reset. Active investigation: **${activeCase || 'None selected'}**. How can I assist you with your motor claim investigation?`,
        sources: ['NATIVE INTELLIGENCE'],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleExportChat = () => {
    const text = messages
      .map((m) => `[${m.timestamp}] ${m.role === 'user' ? 'INVESTIGATOR' : 'FAULTLINE CHATBOT'}:\n${m.content}\nSources: ${(m.sources || []).join(', ')}\n`)
      .join('\n---\n\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `faultline-chatbot-session-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(a);
  };

  // Dynamic Suggestion Pills
  const suggestions = activeCase
    ? [
        'Reconstruct incident timeline',
        'Which exhibits contradict each other?',
        'Check independent corroborations',
        'What are the explainable risk indicators?',
        'How complete is this investigation?',
        'Audit policy conditions and warranties',
        'Generate native investigation report',
        'Draft a claims manager memo',
      ]
    : [
        'How many investigations are under review?',
        'Show recent investigations',
        'Show Intelligence Builder proposals',
        'Where is the Legal & Regulatory Library?',
        'What are the motor insurance rules in UK?',
        'What evidence file formats are supported?',
      ];

  const renderBadge = (source) => {
    switch (source) {
      case 'INTERNAL INTELLIGENCE':
      case 'NATIVE INTELLIGENCE':
      case 'NATIVE INTELLIGENCE (OFFLINE MODE)':
      case 'FALLBACK INTERNAL':
        return <span key={source} className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/20"><Zap className="size-3" /> NATIVE INTELLIGENCE</span>;
      case 'TIMELINE INTELLIGENCE':
        return <span key={source} className="inline-flex items-center gap-1 rounded bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"><Clock className="size-3" /> TIMELINE</span>;
      case 'CONTRADICTION INTELLIGENCE':
        return <span key={source} className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 border border-rose-500/20"><AlertCircle className="size-3" /> CONTRADICTION</span>;
      case 'CORROBORATION INTELLIGENCE':
        return <span key={source} className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="size-3" /> CORROBORATION</span>;
      case 'RISK INTELLIGENCE':
        return <span key={source} className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20"><Shield className="size-3" /> RISK TYPOLOGY</span>;
      case 'COMPLETENESS INTELLIGENCE':
        return <span key={source} className="inline-flex items-center gap-1 rounded bg-pen-wash px-2 py-0.5 text-[11px] font-semibold text-pen-dark dark:text-pen-bright border border-pen/20"><FileText className="size-3" /> COMPLETENESS</span>;
      case 'POLICY INTELLIGENCE':
        return <span key={source} className="inline-flex items-center gap-1 rounded bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"><Shield className="size-3" /> POLICY</span>;
      case 'INTELLIGENCE BUILDER':
        return <span key={source} className="inline-flex items-center gap-1 rounded bg-pen-wash px-2 py-0.5 text-[11px] font-semibold text-pen-dark dark:text-pen-bright border border-pen/20"><Sliders className="size-3" /> GOVERNED BUILDER</span>;
      case 'INTERNAL DATABASE':
        return <span key={source} className="inline-flex items-center gap-1 rounded bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"><Database className="size-3" /> INTERNAL DATABASE</span>;
      case 'EVIDENCE RETRIEVAL':
        return <span key={source} className="inline-flex items-center gap-1 rounded bg-pen-wash px-2 py-0.5 text-[11px] font-semibold text-pen-dark dark:text-pen-bright border border-pen/20"><FileText className="size-3" /> EVIDENCE RETRIEVAL</span>;
      case 'LEGAL LIBRARY':
        return <span key={source} className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"><Scale className="size-3" /> LEGAL LIBRARY</span>;
      case 'CLAUDE SONNET':
        return <span key={source} className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20"><Sparkles className="size-3" /> CLAUDE SONNET ESCALATION</span>;
      case 'LOCAL AI':
        return <span key={source} className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-2 py-0.5 text-[11px] font-semibold text-purple-600 dark:text-purple-400 border border-purple-500/20"><Cpu className="size-3" /> LOCAL AI INFERENCE</span>;
      case 'HYBRID BM25 RAG':
        return <span key={source} className="inline-flex items-center gap-1 rounded bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"><Database className="size-3" /> HYBRID BM25 RAG</span>;
      case 'VALIDATED CITATIONS':
        return <span key={source} className="inline-flex items-center gap-1 rounded bg-teal-500/10 px-2 py-0.5 text-[11px] font-semibold text-teal-600 dark:text-teal-400 border border-teal-500/20"><CheckCircle2 className="size-3" /> VALIDATED CITATIONS</span>;
      default:
        return <span key={source} className="inline-flex items-center gap-1 rounded bg-hover px-2 py-0.5 text-[11px] font-medium text-ink-2 border border-rule">{source}</span>;
    }
  };

  return (
    <div className="relative flex h-[calc(100dvh-3.5rem)] flex-col bg-transparent text-ink overflow-hidden">
      {/* 1. Header Bar */}
      <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-rule bg-sheet/95 backdrop-blur-sm px-5 py-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Sparkles className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[17px] font-bold tracking-tight text-ink">FaultLine Chatbot</h1>
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/20">
                {forceOffline ? 'Pure Native (Offline)' : (statusInfo?.provider?.configured ? 'Hybrid AI' : 'Native Offline AI')}
              </span>
            </div>
            <p className="text-[11px] text-ink-3">
              Independent Native Engines • Governed Intelligence Builder • Optional Claude Escalation
            </p>
          </div>
        </div>

        {/* Center / Right Status Controls */}
        <div className="flex items-center gap-2">
          {/* Active Case Badge */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-md border border-rule bg-paper px-2.5 py-1 text-[12px]">
            <span className="text-ink-3">Context:</span>
            {activeCase ? (
              <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                {activeCase}
                <button
                  type="button"
                  onClick={() => setActiveCase(null)}
                  title="Clear active case context"
                  className="hover:text-ink-1 ml-0.5"
                >
                  <X className="size-3" />
                </button>
              </span>
            ) : (
              <span className="text-ink-3 italic">Global</span>
            )}
          </div>

          {/* Dynamic Active Mode Pill */}
          <div className="hidden md:flex items-center gap-1.5 rounded-md border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
            <Zap className="size-3.5" />
            <span>{forceOffline ? 'OFFLINE (PURE NATIVE)' : (statusInfo?.activeMode || 'NATIVE INTELLIGENCE ACTIVE')}</span>
          </div>

          {/* Force Offline Mode Toggle */}
          <label className="hidden lg:flex items-center gap-1.5 cursor-pointer text-[11px] text-ink-2 select-none border border-rule px-2 py-1 rounded-md bg-paper hover:bg-hover transition-colors">
            <input
              type="checkbox"
              checked={forceOffline}
              onChange={(e) => setForceOffline(e.target.checked)}
              className="rounded border-rule text-blue-600 focus:ring-0 size-3"
            />
            <span className="font-medium">Force Offline</span>
          </label>

          {/* Intelligence Builder Button */}
          <button
            type="button"
            onClick={openBuilderModal}
            className="flex items-center gap-1.5 rounded-md border border-pen/30 bg-pen-wash px-2.5 py-1.5 text-[12px] font-semibold text-pen-dark dark:text-pen-bright hover:bg-pen/15 transition-colors shadow-2xs"
            title="Intelligence Builder & Self-Improvement Governance"
          >
            <Sliders className="size-3.5" />
            <span className="hidden sm:inline">Intelligence Builder</span>
          </button>

          {/* Admin Metrics Button */}
          <button
            type="button"
            onClick={fetchAdminMetrics}
            className="flex items-center gap-1.5 rounded-md border border-rule bg-paper px-2.5 py-1.5 text-[12px] font-medium text-ink-2 hover:bg-hover hover:text-ink transition-colors"
            title="Administrator & Cost Metrics"
          >
            <BarChart3 className="size-3.5" />
            <span className="hidden sm:inline">Admin Metrics</span>
          </button>

          {/* Export Button */}
          <button
            type="button"
            onClick={handleExportChat}
            className="flex items-center gap-1.5 rounded-md border border-rule bg-paper px-2.5 py-1.5 text-[12px] font-medium text-ink-2 hover:bg-hover hover:text-ink transition-colors"
            title="Export conversation history"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* FaultLine Chatbot Companion Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !showCompanion;
              setShowCompanion(next);
              try {
                localStorage.setItem('faultline_show_codex', String(next));
                window.dispatchEvent(
                  new CustomEvent('faultline-companion-visibility', { detail: { visible: next } })
                );
              } catch {}
            }}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
              showCompanion
                ? 'border-pen/30 bg-pen-wash text-pen-dark dark:text-pen-bright'
                : 'border-rule bg-paper text-ink-3 hover:bg-hover hover:text-ink'
            }`}
            title={showCompanion ? 'Hide FaultLine Chatbot companion' : 'Show FaultLine Chatbot companion'}
          >
            <Cloud className="size-3.5" />
            <span className="hidden sm:inline">Companion {showCompanion ? 'ON' : 'OFF'}</span>
          </button>

          {/* New Chat Button */}
          <button
            type="button"
            onClick={handleClearChat}
            className="flex items-center gap-1.5 rounded-md border border-rule bg-paper px-2.5 py-1.5 text-[12px] font-medium text-ink-2 hover:bg-hover hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="Reset conversation"
          >
            <Trash2 className="size-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </header>

      {/* 2. Message History Area */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-6 sm:px-8 space-y-6">
        <div className="mx-auto max-w-4xl space-y-5">
          {messages.map((m, idx) => (
            <div
              key={m.id || idx}
              className={`flex gap-3.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-600/90 text-white shadow-xs p-1">
                  <FaultLineCompanionIcon className="size-5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 text-[14px] shadow-xs ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : m.isError
                    ? 'border border-red-500/30 bg-red-500/10 text-ink'
                    : 'border border-rule bg-sheet text-ink'
                }`}
              >
                {/* Assistant Source Badges Header */}
                {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                  <div className="mb-2.5 flex flex-wrap items-center gap-1.5 border-b border-rule/60 pb-2">
                    {m.sources.map((s) => renderBadge(s))}
                    {m.durationMs !== undefined && (
                      <span className="text-[10px] text-ink-3 ml-auto flex items-center gap-1">
                        <Clock className="size-2.5" /> {m.durationMs}ms
                      </span>
                    )}
                  </div>
                )}

                {/* Content formatted */}
                <div className="whitespace-pre-wrap leading-relaxed font-sans text-[13.5px]">
                  {m.content}
                </div>

                {/* Expandable Forensic Audit Details */}
                {m.role === 'assistant' && (m.routingOutcome || m.validation) && (
                  <div className="mt-3 pt-2 border-t border-rule/50">
                    <button
                      type="button"
                      onClick={() => setExpandedSourceIndex(expandedSourceIndex === idx ? null : idx)}
                      className="flex items-center gap-1 text-[11px] font-medium text-ink-3 hover:text-ink transition-colors"
                    >
                      {expandedSourceIndex === idx ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                      <span>Forensic Audit & Routing Metadata</span>
                    </button>

                    {expandedSourceIndex === idx && (
                      <div className="mt-2 rounded-lg border border-rule bg-paper p-3 text-[11px] text-ink-2 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <strong>Processing Mode:</strong>
                          <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono">
                            {m.processingMode || (m.usedLocalAI ? 'LOCAL_AI' : m.escalatedToClaude ? 'HYBRID' : 'OFFLINE_NATIVE')}
                          </span>
                        </div>
                        <div>• <strong>Routing Outcome:</strong> <code className="text-blue-600 dark:text-blue-400 font-mono">{m.routingOutcome}</code></div>
                        <div>• <strong>AI Engine:</strong> {m.usedLocalAI ? 'Local AI (100% Offline • Zero Egress)' : m.escalatedToClaude ? 'Claude Sonnet (Cloud Escalation)' : 'FaultLine Native Deterministic Engine'}</div>
                        {m.tokens && (
                          <div>• <strong>Token Consumption:</strong> ~{m.tokens.total} total tokens (Input: {m.tokens.input}, Output: {m.tokens.output})</div>
                        )}
                        {m.validation && m.validation.exhibitsVerified && m.validation.exhibitsVerified.length > 0 && (
                          <div>• <strong>Verified Exhibit Citations:</strong> {m.validation.exhibitsVerified.join(', ')}</div>
                        )}
                        {m.validation && m.validation.quoteVerification && m.validation.quoteVerification.totalQuotes > 0 && (
                          <div className="text-emerald-600 dark:text-emerald-400">
                            • <strong>Quote Verifier:</strong> {m.validation.quoteVerification.verifiedQuotes.length}/{m.validation.quoteVerification.totalQuotes} verbatim substrings confirmed in exhibits ({m.validation.quoteVerification.quoteAccuracyRate}%)
                          </div>
                        )}
                        {m.validation && m.validation.groundingScore !== undefined && (
                          <div>• <strong>Grounding Confidence:</strong> {m.validation.groundingScore}%</div>
                        )}
                        {m.validation && m.validation.statementClassification && (
                          <div className="text-ink-3">
                            • <strong>Reasoning Types:</strong> {m.validation.statementClassification.facts} verified facts, {m.validation.statementClassification.inferences} inferences, {m.validation.statementClassification.contradictions} contradictions
                          </div>
                        )}
                        {m.validation && m.validation.warnings && m.validation.warnings.length > 0 && (
                          <div className="text-amber-600 dark:text-amber-400">• <strong>Audit Flags:</strong> {m.validation.warnings.join('; ')}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className={`mt-1.5 text-right text-[10px] ${m.role === 'user' ? 'text-blue-100' : 'text-ink-3'}`}>
                  {m.timestamp}
                </div>
              </div>

              {m.role === 'user' && (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-hover text-ink shadow-xs border border-rule">
                  <User className="size-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3.5 justify-start items-center">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-xs">
                <Bot className="size-4.5" />
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-rule bg-sheet px-4 py-3 text-[13px] text-ink-2">
                <RefreshCw className="size-3.5 animate-spin text-blue-600 dark:text-blue-400" />
                <span>Evaluating native intelligence & cross-referencing exhibits offline...</span>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </div>

      {/* 3. Suggested Prompt Pills */}
      <div className="border-t border-rule bg-sheet/60 px-5 py-2.5">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-ink-3 flex items-center gap-1 mr-1">
            <Zap className="size-3 text-blue-500" /> Native Actions:
          </span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSend(s)}
              className="rounded-full border border-rule bg-paper px-3 py-1 text-[11px] font-medium text-ink-2 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-2xs"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Input Area */}
      <div className="relative z-10 border-t border-rule bg-sheet/95 backdrop-blur-sm px-5 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="mx-auto max-w-4xl flex items-end gap-2.5"
        >
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                activeCase
                  ? `Ask FaultLine Chatbot about ${activeCase} (e.g. "Reconstruct timeline", "Find contradictions", "Check corroboration")...`
                  : 'Ask FaultLine Chatbot about motor claims operations, scenario counts, evidence, or regulations...'
              }
              className="w-full resize-none rounded-xl border border-rule bg-paper px-4 py-2.5 text-[14px] text-ink placeholder:text-ink-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            />
            <div className="absolute right-2.5 bottom-2.5 text-[10px] text-ink-3 hidden sm:block">
              Enter to send, Shift+Enter for new line
            </div>
          </div>

          <Button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex items-center gap-2 h-11 px-5 rounded-xl font-medium"
          >
            <span>Send</span>
            <Send className="size-4" />
          </Button>
        </form>
      </div>

      {/* 5. Intelligence Builder Modal (Sections 11-15: Governed Self-Improvement) */}
      {builderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-rule bg-sheet p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-pen-wash text-pen-dark dark:text-pen-bright border border-pen/20">
                  <Sliders className="size-5" />
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-ink flex items-center gap-2">
                    FaultLine Intelligence Builder
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-pen-wash text-pen-dark dark:text-pen-bright border border-pen/20">
                      Governed Self-Improvement
                    </span>
                  </h3>
                  <p className="text-[11px] text-ink-3">Empirical pattern discovery across 266 scenarios • Structured improvement proposals • Human approval gating</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBuilderModalOpen(false)}
                className="rounded-lg p-1 text-ink-3 hover:bg-hover hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Strict Governance Safety Alert Banner */}
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] text-ink-2">
              <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Shield className="size-4" /> Strict Governance & Human-in-the-Loop Safeguard:
              </span>
              <p className="mt-0.5 text-ink-3">
                The Intelligence Builder is strictly governed. It <strong>never</strong> rewrites application source code or modifies production claim decisions autonomously. All rules and checklists require human verification and explicit approval before activation.
              </p>
            </div>

            {/* Notification message */}
            {builderMessage && (
              <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-2 text-[12px] text-blue-600 dark:text-blue-400 font-medium">
                {builderMessage}
              </div>
            )}

            {/* Tab navigation */}
            <div className="flex items-center gap-2 border-b border-rule text-[13px]">
              <button
                type="button"
                onClick={() => setBuilderTab('proposals')}
                className={`pb-2 font-medium border-b-2 transition-colors ${
                  builderTab === 'proposals'
                    ? 'border-pen text-pen-dark dark:text-pen-bright font-semibold'
                    : 'border-transparent text-ink-3 hover:text-ink'
                }`}
              >
                Improvement Proposals ({builderProposals.length})
              </button>
              <button
                type="button"
                onClick={() => setBuilderTab('patterns')}
                className={`pb-2 font-medium border-b-2 transition-colors ${
                  builderTab === 'patterns'
                    ? 'border-pen text-pen-dark dark:text-pen-bright font-semibold'
                    : 'border-transparent text-ink-3 hover:text-ink'
                }`}
              >
                Discovered Patterns ({builderPatterns?.discoveredPatterns?.length || 3})
              </button>
              <button
                type="button"
                onClick={() => setBuilderTab('rules')}
                className={`pb-2 font-medium border-b-2 transition-colors ${
                  builderTab === 'rules'
                    ? 'border-pen text-pen-dark dark:text-pen-bright font-semibold'
                    : 'border-transparent text-ink-3 hover:text-ink'
                }`}
              >
                Active Governed Rules ({builderRules.length})
              </button>
              <button
                type="button"
                onClick={() => setBuilderTab('audit')}
                className={`pb-2 font-medium border-b-2 transition-colors ${
                  builderTab === 'audit'
                    ? 'border-pen text-pen-dark dark:text-pen-bright font-semibold'
                    : 'border-transparent text-ink-3 hover:text-ink'
                }`}
              >
                Audit History ({builderAudit.length})
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {builderLoading ? (
                <div className="flex items-center justify-center p-8 text-ink-3 gap-2">
                  <RefreshCw className="size-4 animate-spin text-pen" />
                  <span>Loading Intelligence Builder records...</span>
                </div>
              ) : builderTab === 'proposals' ? (
                <div className="space-y-4">
                  {builderProposals.map((p) => (
                    <div key={p.id} className="rounded-xl border border-rule bg-paper p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-pen-dark dark:text-pen-bright">{p.id}</span>
                            <span className="rounded bg-hover px-2 py-0.5 text-[10px] font-semibold text-ink-2 border border-rule">{p.category}</span>
                            <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                              p.approvalStatus === 'ACTIVATED'
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                : p.approvalStatus === 'APPROVED'
                                ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                : p.approvalStatus === 'ROLLBACK'
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                            }`}>
                              {p.approvalStatus}
                            </span>
                          </div>
                          <h4 className="mt-1 text-[14px] font-bold text-ink">{p.title}</h4>
                        </div>
                        {p.validationScore !== null && (
                          <div className="text-right">
                            <span className="block text-[10px] text-ink-3">Benchmark Score</span>
                            <span className="text-[15px] font-bold text-emerald-600 dark:text-emerald-400">{p.validationScore}%</span>
                          </div>
                        )}
                      </div>

                      <p className="text-[12.5px] text-ink-2 leading-relaxed">
                        <strong>Empirical Pattern:</strong> {p.pattern} (Sample: {p.sampleSize} benchmark cases)
                      </p>

                      <div className="rounded-lg border border-pen/20 bg-pen-wash p-3 text-[12px] text-ink space-y-1">
                        <div className="font-semibold text-pen-dark dark:text-pen-bright">Proposed Verification Rule / Checklist:</div>
                        <div className="font-mono text-[11.5px]">{p.proposedChecklist}</div>
                        <div className="text-[11px] text-ink-3 pt-1">
                          <strong>False-Positive Risk:</strong> {p.falsePositiveRisk} • <strong>Expected Benefit:</strong> {p.expectedBenefit}
                        </div>
                      </div>

                      {/* Governance Action Controls */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-rule/50">
                        <button
                          type="button"
                          onClick={() => handleValidateProposal(p.id)}
                          className="flex items-center gap-1 rounded-md border border-rule bg-sheet px-2.5 py-1 text-[11px] font-medium text-ink-2 hover:bg-hover hover:text-ink transition-colors"
                        >
                          <CheckCircle2 className="size-3 text-blue-500" />
                          <span>Validate against 266 Benchmarks</span>
                        </button>

                        <div className="flex items-center gap-2">
                          {p.approvalStatus !== 'APPROVED' && p.approvalStatus !== 'ACTIVATED' && (
                            <button
                              type="button"
                              onClick={() => handleApproveProposal(p.id)}
                              className="flex items-center gap-1 rounded-md border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
                            >
                              <Check className="size-3" />
                              <span>Approve (Human Gate)</span>
                            </button>
                          )}

                          {p.approvalStatus === 'APPROVED' && (
                            <button
                              type="button"
                              onClick={() => handleActivateRule(p.id)}
                              className="flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            >
                              <Zap className="size-3" />
                              <span>Activate Rule</span>
                            </button>
                          )}

                          {p.approvalStatus === 'ACTIVATED' && (
                            <button
                              type="button"
                              onClick={() => handleRollbackRule(p.id)}
                              className="flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
                            >
                              <RotateCcw className="size-3" />
                              <span>Rollback Rule</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : builderTab === 'patterns' ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-rule bg-paper p-3 text-[12px] text-ink-2">
                    <span className="font-semibold text-ink">Benchmark Dataset Analysis:</span> Evaluated 266 realistic motor claim scenarios across 20 countries to discover recurring forensic anomalies.
                  </div>
                  {(builderPatterns?.discoveredPatterns || []).map((pat) => (
                    <div key={pat.id} className="rounded-xl border border-rule bg-paper p-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-pen-dark dark:text-pen-bright">{pat.id}</span>
                        <span className="text-[11px] text-ink-3">Impacts {pat.affectedScenariosCount} Scenarios</span>
                      </div>
                      <h4 className="text-[14px] font-bold text-ink">{pat.name}</h4>
                      <p className="text-[12.5px] text-ink-2">{pat.description}</p>
                      <div className="mt-2 text-[11.5px] text-pen-dark dark:text-pen-bright font-medium">
                        Recommended Intervention: {pat.recommendedIntervention}
                      </div>
                    </div>
                  ))}
                </div>
              ) : builderTab === 'rules' ? (
                <div className="space-y-3">
                  {builderRules.length === 0 ? (
                    <div className="p-4 text-center text-[13px] text-ink-3">No active rules currently deployed.</div>
                  ) : (
                    builderRules.map((r) => (
                      <div key={r.ruleId} className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{r.ruleId} ({r.version})</span>
                          <span className="text-[11px] text-ink-3">Activated by {r.activatedBy}</span>
                        </div>
                        <h4 className="text-[13.5px] font-bold text-ink">{r.title}</h4>
                        <p className="text-[12px] font-mono text-ink-2 bg-paper p-2.5 rounded border border-rule">{r.ruleText}</p>
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleRollbackRule(r.ruleId)}
                            className="flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-600 hover:bg-amber-500/20 transition-colors"
                          >
                            <RotateCcw className="size-3" /> Rollback Rule
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {builderAudit.length === 0 ? (
                    <div className="p-4 text-center text-[13px] text-ink-3">No governance audit events recorded yet.</div>
                  ) : (
                    builderAudit.map((a, i) => (
                      <div key={i} className="flex items-center justify-between border-b border-rule/50 py-2 text-[12px]">
                        <div>
                          <span className="font-mono font-bold text-pen-dark dark:text-pen-bright mr-2">{a.action}</span>
                          <span className="text-ink-2">{a.proposalId || a.ruleId}</span>
                          {a.notes && <span className="text-ink-3 ml-2 italic">({a.notes})</span>}
                        </div>
                        <div className="text-[11px] text-ink-3">
                          {new Date(a.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-rule pt-3">
              <Button onClick={() => setBuilderModalOpen(false)}>Close Builder</Button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Administrator Metrics Modal */}
      {adminModalOpen && adminMetrics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-rule bg-sheet p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <BarChart3 className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-ink">FaultLine Intelligence — Admin & Cost Analytics</h3>
                  <p className="text-[11px] text-ink-3">Live tracking of Internal-First routing efficiency and LLM token expenditures</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdminModalOpen(false)}
                className="rounded-lg p-1 text-ink-3 hover:bg-hover hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-rule bg-paper p-3 text-center">
                <span className="block text-[11px] font-medium text-ink-3">Total Queries</span>
                <span className="block text-[22px] font-bold text-ink">{adminMetrics.totalRequests}</span>
              </div>
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-center">
                <span className="block text-[11px] font-medium text-blue-600 dark:text-blue-400">Internal Resolved</span>
                <span className="block text-[22px] font-bold text-blue-600 dark:text-blue-400">{adminMetrics.internalAnswerPercentage}</span>
              </div>
              <div className="rounded-xl border border-rule bg-paper p-3 text-center">
                <span className="block text-[11px] font-medium text-ink-3">Avg Latency</span>
                <span className="block text-[22px] font-bold text-ink">{adminMetrics.averageLatencyMs} ms</span>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
                <span className="block text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Cost Saved</span>
                <span className="block text-[22px] font-bold text-emerald-600 dark:text-emerald-400">{adminMetrics.estimatedCostSavedUSD}</span>
              </div>
            </div>

            {/* Audit Log Table */}
            <div>
              <h4 className="text-[13px] font-semibold text-ink mb-2">Recent Orchestrator Routing Events</h4>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-rule bg-paper text-[11px]">
                <table className="w-full text-left">
                  <thead className="bg-sheet/80 border-b border-rule sticky top-0 text-ink-3">
                    <tr>
                      <th className="py-2 px-3">Time</th>
                      <th className="py-2 px-3">Intent</th>
                      <th className="py-2 px-3">Routing Outcome</th>
                      <th className="py-2 px-3">Escalated</th>
                      <th className="py-2 px-3">Latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule text-ink-2">
                    {adminMetrics.recentAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-hover/50">
                        <td className="py-1.5 px-3">{new Date(log.timestamp).toLocaleTimeString()}</td>
                        <td className="py-1.5 px-3 font-medium">{log.intent}</td>
                        <td className="py-1.5 px-3 font-mono text-[10px]">{log.outcome}</td>
                        <td className="py-1.5 px-3">{log.escalatedToClaude ? <span className="text-amber-500 font-semibold">Yes</span> : <span className="text-emerald-600 dark:text-emerald-400">No (0 Tokens)</span>}</td>
                        <td className="py-1.5 px-3">{log.durationMs}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setAdminModalOpen(false)}>Close Analytics</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
