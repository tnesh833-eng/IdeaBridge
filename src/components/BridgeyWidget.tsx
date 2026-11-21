import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, MessageCircle, Send, Sparkles } from 'lucide-react';
import { askBridgey, fetchBridgeyChecklist } from '../api';
import type { BridgeyMessage } from '../types';

interface BridgeyWidgetProps {
  collegeId: string;
  collegeName: string;
  eventId?: string | null;
  eventTitle?: string | null;
  refreshKey?: number;
}

const BRIDGEY_AVATAR_URL = '/src/assets/images/bridgey_owl_mascot_1795263067390.jpg';

const QUICK_QUESTIONS = [
  'What food is good at the canteen?',
  'Where are the restrooms?',
  'How do I reach the venue?',
  'How should I prepare and pitch to judges?',
  'What should I carry?',
];

export function BridgeyWidget({
  collegeId,
  collegeName,
  eventId = null,
  eventTitle = null,
  refreshKey = 0,
}: BridgeyWidgetProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [checklist, setChecklist] = useState<string[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [messages, setMessages] = useState<BridgeyMessage[]>([]);
  const [input, setInput] = useState('');
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setChecklistLoading(true);
    setCheckedItems({});
    fetchBridgeyChecklist({ collegeId, eventId })
      .then((res) => {
        if (active) {
          setChecklist(res.checklist);
        }
      })
      .catch(() => {
        if (active) {
          setChecklist([]);
        }
      })
      .finally(() => {
        if (active) setChecklistLoading(false);
      });

    return () => {
      active = false;
    };
  }, [collegeId, eventId, refreshKey]);

  useEffect(() => {
    setMessages([
      {
        id: `intro-${collegeId}-${eventId ?? 'college'}`,
        role: 'assistant',
        text: eventTitle
          ? `Hoo-hoo! I'm Bridgey. Ask me about ${collegeName}, canteen picks, restrooms, transport, or how to pitch at ${eventTitle}. I only share saved campus info and never make things up.`
          : `Hoo-hoo! I'm Bridgey, your campus guide for ${collegeName}. Ask me about food, restrooms, reaching the venue, Wi-Fi, or presentation tips—I'll stick strictly to saved college facts and reviews.`,
      },
    ]);
    setError(null);
  }, [collegeId, collegeName, eventId, eventTitle]);

  async function submitQuestion(rawQuestion: string) {
    const trimmed = rawQuestion.trim();
    if (!trimmed || asking) return;

    const userMsg: BridgeyMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setAsking(true);
    setError(null);

    try {
      const response = await askBridgey({
        collegeId,
        eventId,
        question: trimmed,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: response.answer,
          cached: response.cached,
        },
      ]);

      if (response.checklist && response.checklist.length > 0) {
        setChecklist(response.checklist);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Bridgey is unavailable right now. Please try again.'
      );
    } finally {
      setAsking(false);
    }
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    void submitQuestion(input);
  }

  function toggleChecklistItem(index: number) {
    setCheckedItems((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  return (
    <section
      aria-label="Bridgey event assistant"
      className="rounded-3xl border border-blue-200/80 bg-white p-5 shadow-xs sm:p-6"
    >
      {/* Header with Bridgey Owl Mascot */}
      <div className="flex items-start gap-4 border-b border-slate-100 pb-4">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-blue-200 bg-blue-50">
          {!imgFailed ? (
            <img
              src={BRIDGEY_AVATAR_URL}
              alt="Bridgey the owl mascot"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-blue-700">
              <Sparkles className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-bold text-slate-900">
              Bridgey · Campus & Pitch Guide
            </h3>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Grounded in saved {collegeName} details and student reviews. If something isn&apos;t saved yet, Bridgey tells you honestly.
          </p>
        </div>
      </div>

      {/* Prepare for this event checklist */}
      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
        <p className="font-display text-xs font-semibold tracking-wide text-blue-800 uppercase">
          Prepare for this event
        </p>
        {checklistLoading ? (
          <div className="mt-2.5 space-y-2">
            <div className="h-4 w-4/5 animate-pulse rounded bg-blue-100" />
            <div className="h-4 w-3/5 animate-pulse rounded bg-blue-100" />
          </div>
        ) : checklist.length === 0 ? (
          <p className="mt-2 text-xs text-slate-600">
            Check the college tips above and bring your student ID, laptop charger, and a short demo script.
          </p>
        ) : (
          <ul className="mt-2.5 space-y-2">
            {checklist.map((item, index) => {
              const checked = Boolean(checkedItems[index]);
              return (
                <li key={`${index}-${item.slice(0, 16)}`}>
                  <button
                    type="button"
                    onClick={() => toggleChecklistItem(index)}
                    className="flex min-h-[36px] w-full items-start gap-2.5 text-left text-xs leading-relaxed text-slate-800 transition-colors hover:text-blue-800"
                  >
                    <CheckCircle2
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        checked ? 'text-blue-600' : 'text-blue-300'
                      }`}
                    />
                    <span className={checked ? 'line-through text-slate-400' : ''}>{item}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Chat Conversation */}
      <div className="mt-4 space-y-3">
        <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#0052CC] text-white'
                    : 'border border-slate-200 bg-slate-50 text-slate-800'
                }`}
              >
                <p className="whitespace-pre-line">{msg.text}</p>
                {msg.role === 'assistant' && msg.cached !== undefined && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    {msg.cached ? 'Cached answer' : 'Verified from saved venue info'}
                  </p>
                )}
              </div>
            </div>
          ))}

          {asking && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500">
                Bridgey is checking saved venue notes...
              </div>
            </div>
          )}
        </div>

        {/* Quick Questions */}
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <MessageCircle className="h-3.5 w-3.5 text-blue-600" />
            Quick questions
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={asking}
                onClick={() => void submitQuestion(q)}
                className="min-h-[36px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-left text-xs font-medium text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700"
          >
            {error}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleFormSubmit} className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={400}
            placeholder="Ask Bridgey about food, restrooms, transit, or judge demos..."
            className="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            disabled={asking || input.trim().length < 2}
            aria-label="Ask Bridgey"
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#0052CC] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0044AD] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Ask</span>
          </button>
        </form>
      </div>
    </section>
  );
}
