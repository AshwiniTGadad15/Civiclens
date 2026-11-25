import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bot,
  Check,
  Copy,
  ExternalLink,
  Globe,
  History,
  Send,
  Trash2,
} from 'lucide-react';
import { api } from '../lib/api';
import { useApp } from '../context/AppContext';
import { SAMPLE_AI_QUESTIONS, SUPPORTED_LANGUAGES, formatShortDate } from '../lib/constants';
import type { AiConversationRecord, StructuredAiResponse } from '../types/civic';

interface ChatItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  structured?: StructuredAiResponse;
  error?: string;
}

export function AssistantPage() {
  const { user, locations, selectedLocation } = useApp();
  const [searchParams] = useSearchParams();

  const [language, setLanguage] = useState(user?.preferredLanguage || 'en');
  const [localityContext, setLocalityContext] = useState(
    selectedLocation ? `${selectedLocation.name}, ${selectedLocation.state}` : 'Bengaluru, Karnataka'
  );
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [savedConversations, setSavedConversations] = useState<AiConversationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const autoAskedRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      api
        .getAiConversations()
        .then((list) => setSavedConversations(list))
        .catch(() => {});
    } else {
      setSavedConversations([]);
    }
  }, [user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendQuestion = async (questionText: string) => {
    const q = questionText.trim();
    if (!q || loading) return;

    const userMsg: ChatItem = { id: `u-${Date.now()}`, role: 'user', content: q };
    const nextHistory = messages
      .filter((m) => !m.error)
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.askAi({
        question: q,
        localityContext,
        language,
        conversationId,
        history: nextHistory,
      });

      if (res.conversationId) {
        setConversationId(res.conversationId);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: res.structured.directAnswer,
          structured: res.structured,
        },
      ]);

      if (user) {
        api
          .getAiConversations()
          .then((list) => setSavedConversations(list))
          .catch(() => {});
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: '',
          error: err instanceof Error ? err.message : 'Unable to reach CivicLens AI right now.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialQ = searchParams.get('q');
    if (initialQ && !autoAskedRef.current) {
      autoAskedRef.current = true;
      sendQuestion(initialQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleCopy = (msg: ChatItem) => {
    const s = msg.structured;
    const text = s
      ? `${s.directAnswer}\n\nExplanation: ${s.explanation}\n\nLikely Department: ${s.likelyDepartment.name} (${s.likelyDepartment.jurisdiction})\n\nNext Steps:\n${s.recommendedSteps.map((st, i) => `${i + 1}. ${st}`).join('\n')}\n\nNote: ${s.certaintyNote}`
      : msg.content;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 1800);
    });
  };

  const handleLoadConversation = (conv: AiConversationRecord) => {
    setConversationId(conv.id);
    setLocalityContext(conv.localityContext);
    setLanguage(conv.language);
    setMessages(
      conv.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        structured: m.structured,
      }))
    );
  };

  const handleClearChat = () => {
    setMessages([]);
    setConversationId(undefined);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header & Controls */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#20364A] pb-6 lg:flex-row lg:items-end">
        <div>
          <div className="text-xs font-medium text-[#36C5D9]">CivicLens AI · Multilingual Civic Intelligence</div>
          <h1 className="mt-1.5 font-display text-3xl font-bold text-[#F4F8FC]">Ask CivicLens AI</h1>
          <p className="mt-1.5 text-sm text-[#9AABBB]">
            Structured, location-aware answers explaining Indian municipal responsibilities, causes, next steps, and
            official portals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-xs">
            <Globe className="h-3.5 w-3.5 text-[#19C98A]" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label="Response language"
              className="bg-transparent text-[#F4F8FC] focus:outline-none"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="bg-[#102338]">
                  {l.name} ({l.native})
                </option>
              ))}
            </select>
          </div>

          <select
            value={localityContext}
            onChange={(e) => setLocalityContext(e.target.value)}
            aria-label="Locality context"
            className="rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2 text-xs text-[#F4F8FC]"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={`${loc.name}, ${loc.state}`} className="bg-[#102338]">
                Context: {loc.name}, {loc.state}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleClearChat}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#20364A] bg-[#102338] px-3 py-2 text-xs font-medium text-[#9AABBB] hover:text-[#F4F8FC]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Chat</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* Left Sidebar: Suggested Questions & History */}
        <aside className="space-y-5 lg:col-span-4">
          <div className="rounded-xl border border-[#20364A] bg-[#102338] p-5">
            <h2 className="text-xs font-semibold text-[#F4F8FC]">Suggested Civic Questions</h2>
            <div className="mt-3 space-y-2">
              {SAMPLE_AI_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendQuestion(q)}
                  className="block w-full rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-2.5 text-left text-xs leading-relaxed text-[#F4F8FC] transition-colors hover:border-[#19C98A]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#20364A] bg-[#102338] p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#F4F8FC]">
              <History className="h-3.5 w-3.5 text-[#36C5D9]" />
              <span>Conversation History</span>
            </div>
            {!user ? (
              <p className="mt-2.5 text-xs text-[#9AABBB]">
                Sign in to save your CivicLens AI conversations to your citizen dashboard.
              </p>
            ) : savedConversations.length === 0 ? (
              <p className="mt-2.5 text-xs text-[#9AABBB]">Your saved civic conversations will appear here.</p>
            ) : (
              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                {savedConversations.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleLoadConversation(c)}
                    className={`block w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                      conversationId === c.id
                        ? 'border-[#19C98A] bg-[#142B40] text-[#F4F8FC]'
                        : 'border-[#20364A] bg-[#0B1929] text-[#9AABBB] hover:text-[#F4F8FC]'
                    }`}
                  >
                    <div className="truncate font-medium text-[#F4F8FC]">{c.title}</div>
                    <div className="mt-0.5 text-[11px] text-[#9AABBB]">
                      {c.localityContext} · {formatShortDate(c.updatedAt)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Right Chat Workspace */}
        <section className="flex flex-col rounded-2xl border border-[#20364A] bg-[#0B1929] lg:col-span-8 min-h-[600px]">
          <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
            {messages.length === 0 ? (
              <div className="flex h-full min-h-[380px] flex-col items-center justify-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#20364A] bg-[#102338] text-[#19C98A]">
                  <Bot className="h-6 w-6" />
                </div>
                <h2 className="mt-4 font-display text-xl font-bold text-[#F4F8FC]">
                  CivicLens AI is ready for {localityContext}
                </h2>
                <p className="mt-2 max-w-md text-sm text-[#9AABBB]">
                  Ask in English, Kannada, Hindi, Tamil, Telugu, Malayalam, Marathi, or Bengali about civic services,
                  departments, complaints, or public infrastructure.
                </p>
              </div>
            ) : (
              messages.map((msg) =>
                msg.role === 'user' ? (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-xl rounded-2xl rounded-br-sm bg-[#142B40] px-4 py-3 text-sm text-[#F4F8FC] border border-[#20364A]">
                      {msg.content}
                    </div>
                  </div>
                ) : msg.error ? (
                  <div
                    key={msg.id}
                    className="rounded-xl border border-[#FB7185]/40 bg-[#FB7185]/10 p-4 text-sm text-[#FB7185]"
                  >
                    {msg.error}
                  </div>
                ) : (
                  <div key={msg.id} className="rounded-2xl border border-[#20364A] bg-[#102338] p-5 sm:p-6">
                    <div className="flex items-center justify-between border-b border-[#20364A] pb-3 text-xs text-[#9AABBB]">
                      <span>
                        CivicLens AI · AI Generated Guidance · {msg.structured?.languageName || 'English'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(msg)}
                        className="inline-flex items-center gap-1 text-[#9AABBB] hover:text-[#19C98A]"
                      >
                        {copiedId === msg.id ? <Check className="h-3.5 w-3.5 text-[#19C98A]" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {msg.structured && (
                      <div className="mt-4 space-y-5 text-sm">
                        {/* 1. Direct Answer */}
                        <div>
                          <div className="text-xs font-semibold text-[#19C98A]">Direct Answer</div>
                          <p className="mt-1 text-base font-medium leading-relaxed text-[#F4F8FC]">
                            {msg.structured.directAnswer}
                          </p>
                        </div>

                        {/* 2. Explanation */}
                        <div>
                          <div className="text-xs font-semibold text-[#9AABBB]">Civic Explanation</div>
                          <p className="mt-1 leading-relaxed text-[#F4F8FC]/90">{msg.structured.explanation}</p>
                        </div>

                        {/* 3 & 4. Causes + Impact */}
                        <div className="grid gap-4 sm:grid-cols-2">
                          {msg.structured.possibleCauses.length > 0 && (
                            <div className="rounded-xl border border-[#20364A] bg-[#0B1929] p-4">
                              <div className="text-xs font-semibold text-[#F4F8FC]">Possible Causes</div>
                              <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs text-[#9AABBB]">
                                {msg.structured.possibleCauses.map((c, idx) => (
                                  <li key={idx}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="rounded-xl border border-[#20364A] bg-[#0B1929] p-4">
                            <div className="text-xs font-semibold text-[#F4F8FC]">Impact on Citizens</div>
                            <p className="mt-2 text-xs leading-relaxed text-[#9AABBB]">{msg.structured.citizenImpact}</p>
                          </div>
                        </div>

                        {/* 5. Likely Responsible Department */}
                        <div className="rounded-xl border border-[#20364A] bg-[#0B1929] p-4">
                          <div className="text-xs font-semibold text-[#36C5D9]">Likely Responsible Department</div>
                          <div className="mt-1 font-semibold text-[#F4F8FC]">{msg.structured.likelyDepartment.name}</div>
                          <div className="mt-0.5 text-xs text-[#9AABBB]">
                            Jurisdiction: {msg.structured.likelyDepartment.jurisdiction}
                          </div>
                          <div className="mt-1 text-xs text-[#9AABBB]">
                            {msg.structured.likelyDepartment.confidenceNote}
                          </div>
                        </div>

                        {/* 6. Recommended Next Steps */}
                        {msg.structured.recommendedSteps.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-[#F4F8FC]">Recommended Next Steps</div>
                            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs text-[#F4F8FC]/90">
                              {msg.structured.recommendedSteps.map((s, idx) => (
                                <li key={idx}>{s}</li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {/* 7. Official Links & Sources */}
                        {msg.structured.sources.length > 0 && (
                          <div className="border-t border-[#20364A] pt-4">
                            <div className="text-xs font-semibold text-[#9AABBB]">Authoritative References</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {msg.structured.sources.map((src, idx) => (
                                <a
                                  key={idx}
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#20364A] bg-[#0B1929] px-3 py-1.5 text-xs text-[#36C5D9] hover:border-[#36C5D9]"
                                >
                                  <span>{src.title}</span>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Certainty disclaimer */}
                        <div className="border-t border-[#20364A] pt-3 text-[11px] text-[#9AABBB]">
                          {msg.structured.certaintyNote}
                        </div>
                      </div>
                    )}
                  </div>
                )
              )
            )}

            {loading && (
              <div className="flex items-center gap-3 rounded-xl border border-[#20364A] bg-[#102338] px-4 py-3 text-xs text-[#9AABBB]">
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#19C98A] animate-bounce" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#19C98A] animate-bounce [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#19C98A] animate-bounce [animation-delay:240ms]" />
                </span>
                <span>CivicLens AI is analyzing municipal responsibilities for {localityContext}...</span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendQuestion(input);
            }}
            className="border-t border-[#20364A] p-4"
          >
            <div className="flex items-center gap-2 rounded-xl border border-[#20364A] bg-[#102338] p-1.5 focus-within:border-[#19C98A]">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask CivicLens AI about ${localityContext}...`}
                className="w-full bg-transparent px-3 py-2 text-sm text-[#F4F8FC] placeholder:text-[#9AABBB]/75 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#19C98A] px-4 py-2 text-xs font-semibold text-[#07111F] hover:bg-[#48E6B0] disabled:opacity-40 whitespace-nowrap shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Ask</span>
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
