import { useState, useEffect } from 'react';
import {
  BookOpen,
  Bot,
  Check,
  Copy,
  ExternalLink,
  MessageSquare,
  Scale,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { askJurisdictionAssistant } from '../../../shared/regulations/query.js';
import { COUNTRY_METADATA } from '../../../shared/regulations/vocab.js';

const SAMPLE_QUESTIONS = [
  'What is the statutory deadline to report a motor accident to the police?',
  'How does comparative fault work in rear-end or roundabout collisions?',
  'What are the statutory definitions and penal consequences for motor insurance fraud?',
  'What is the statutory compensation tariff or process for whiplash and soft-tissue injury?',
  'What are the rules regarding vehicle damage write-offs, total loss thresholds and salvage?',
  'Are telematics data and dashcam footage admissible in civil claims?',
];

export default function LegalAssistantModal({
  countryCode = 'UK',
  initialQuestion = '',
  conflictContext = null,
  onClose,
  onOpenRegulation,
}) {
  const [question, setQuestion] = useState('');
  const [copiedRef, setCopiedRef] = useState(null);
  const [history, setHistory] = useState([
    {
      sender: 'assistant',
      text: conflictContext
        ? `I have initialized statutory analysis for ${COUNTRY_METADATA[countryCode]?.name || countryCode} regarding: "${conflictContext.title || conflictContext.description}". How can I assist with statutory definitions, liability tests, or evidence admissibility?`
        : `Hello! I am your AI Legal Research Assistant for ${COUNTRY_METADATA[countryCode]?.name || countryCode}. Ask me any question regarding motor traffic statutes, mandatory insurance limits, accident reporting deadlines, bodily injury tariffs, fraud penalties, or claims procedures.`,
      citations: [],
    },
  ]);
  const [loading, setLoading] = useState(false);

  const countryMeta = COUNTRY_METADATA[countryCode] || { flag: '🌐', name: countryCode };

  const handleAsk = (qText) => {
    const query = qText || question;
    if (!query || !query.trim()) return;

    const userMessage = { sender: 'user', text: query };
    setHistory((prev) => [...prev, userMessage]);
    setQuestion('');
    setLoading(true);

    setTimeout(() => {
      const response = askJurisdictionAssistant({ countryCode, question: query });
      setHistory((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: response.answer,
          citations: response.citations,
        },
      ]);
      setLoading(false);
    }, 300);
  };

  useEffect(() => {
    if (initialQuestion && initialQuestion.trim()) {
      handleAsk(initialQuestion.trim());
    }
  }, [initialQuestion]);

  const handleCopyCitation = (cit) => {
    const textToCopy = `${cit.title} — ${cit.legalReference} (${cit.authority || countryCode})`;
    navigator.clipboard?.writeText(textToCopy);
    setCopiedRef(cit.legalReference);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative flex flex-col w-full max-w-3xl h-[85vh] rounded-2xl border border-rule bg-sheet shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-rule bg-card-elevated/40">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-pen/10 border border-pen/20 flex items-center justify-center text-pen-bright">
              <Bot className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{countryMeta.flag}</span>
                <h2 className="text-[16px] font-bold text-ink leading-tight">
                  {countryMeta.name} Legal Research Assistant
                </h2>
                <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-400">
                  Verified Statutes
                </span>
              </div>
              <p className="text-[12px] text-ink-3">
                Retrieval-grounded legal questions answered with statutory citations
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-ink-3 hover:text-ink hover:bg-hover transition-colors"
            aria-label="Close assistant"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {history.map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-pen text-white rounded-br-xs shadow-xs'
                    : 'bg-paper text-ink border border-rule rounded-bl-xs shadow-xs'
                }`}
              >
                <div className="whitespace-pre-line">{msg.text}</div>

                {/* Citations block for assistant answers */}
                {Array.isArray(msg.citations) && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-rule/60 text-[12px]">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-pen-bright mb-1 flex items-center gap-1">
                      <Scale className="size-3" />
                      Statutory Citations:
                    </div>
                    {msg.citations.map((cit, cIdx) => (
                      <div key={cIdx} className="bg-sheet/80 p-2.5 rounded-lg border border-rule/50 my-1.5 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-ink">{cit.title}</div>
                            <div className="font-mono text-pen-bright text-[11px]">{cit.legalReference}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyCitation(cit)}
                            className="inline-flex items-center gap-1 rounded bg-pen/10 hover:bg-pen/20 px-2 py-0.5 text-[11px] font-medium text-pen-bright transition-colors shrink-0"
                            title="Copy statutory citation to clipboard"
                          >
                            {copiedRef === cit.legalReference ? (
                              <>
                                <Check className="size-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="size-3" />
                                <span>Copy Citation</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="text-ink-3 text-[11px]">{cit.authority}</div>
                        {cit.sourceUrl && (
                          <a
                            href={cit.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-pen-bright hover:underline text-[11px] pt-0.5"
                          >
                            <ExternalLink className="size-3" />
                            <span>View official legislative source</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-ink-3 text-[13px] italic">
              <Sparkles className="size-4 animate-spin text-pen-bright" />
              <span>Analyzing statutes and cross-referencing legal provisions…</span>
            </div>
          )}
        </div>

        {/* Suggested Queries Chips */}
        <div className="px-5 py-2.5 border-t border-rule bg-sheet/60 overflow-x-auto flex items-center gap-1.5 scrollbar-visible">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-3 whitespace-nowrap mr-1">
            Suggested:
          </span>
          {SAMPLE_QUESTIONS.slice(0, 3).map((sq, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleAsk(sq)}
              className="text-[11.5px] rounded-lg border border-rule bg-paper px-2.5 py-1 text-ink-2 hover:border-pen hover:text-pen-bright whitespace-nowrap transition-colors"
            >
              {sq}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-rule bg-card-elevated/40">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={`Ask a legal question about ${countryMeta.name} motor claims...`}
              className="flex-1 h-10 px-3.5 rounded-xl border border-rule bg-paper text-[13.5px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-pen transition-colors"
            />
            <button
              type="submit"
              disabled={!question.trim() || loading}
              className="inline-flex size-10 items-center justify-center rounded-xl bg-pen text-white shadow-xs hover:bg-pen-bright disabled:opacity-50 transition-colors"
              aria-label="Send query"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
