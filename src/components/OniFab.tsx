"use client";

import { useCallback, useRef, useState } from "react";
import { OniAvatar } from "./OniAvatar";
import type { ChatMessage } from "@/lib/types";

interface Props {
  /** Contexte de la page envoyé en amont à Oni pour qu'il réponde utile. */
  pageContext?: string;
}

export function OniFab({ pageContext }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  };

  const send = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || streaming) return;
      setError(null);

      // Premier tour : on injecte le contexte de page en tête pour cadrer Oni.
      const isFirstTurn = messages.length === 0;
      const outbound: ChatMessage[] = [
        ...messages,
        {
          role: "user",
          content:
            isFirstTurn && pageContext
              ? `[Contexte de la page où je suis]\n${pageContext}\n\n[Ma question]\n${trimmed}`
              : trimmed,
          timestamp: new Date().toISOString(),
        },
      ];
      // Ce qu'on affiche dans la bulle : jamais le préambule contexte.
      const displayed: ChatMessage[] = [
        ...messages,
        { role: "user", content: trimmed, timestamp: new Date().toISOString() },
      ];
      setMessages(displayed);
      setInput("");
      setStreaming(true);
      setStreamBuffer("");
      scrollToBottom();

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: outbound }),
        });
        if (!res.ok || !res.body) throw new Error(`Erreur ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setStreamBuffer(acc);
          scrollToBottom();
        }
        setMessages([
          ...displayed,
          { role: "assistant", content: acc, timestamp: new Date().toISOString() },
        ]);
        setStreamBuffer("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur réseau");
      } finally {
        setStreaming(false);
        scrollToBottom();
      }
    },
    [messages, pageContext, streaming]
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 group flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-pill bg-surface-1 border border-gray-200 shadow-card hover:shadow-lg hover:pr-4 transition-all"
        aria-label="Parler à Oni"
      >
        <div className="relative">
          <OniAvatar size={36} />
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-status-solid border-2 border-surface-1" />
        </div>
        <span className="hidden group-hover:inline text-sm font-semibold text-gray-900 whitespace-nowrap">
          Parle à Oni
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/30"
          onClick={() => setOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-full max-w-md bg-surface border-l border-gray-200 shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <OniAvatar size={32} speaking={streaming} />
                <div>
                  <div className="font-semibold text-gray-900">Oni</div>
                  <div className="text-xs text-status-solid">
                    {streaming ? "Écrit…" : "En ligne"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-card hover:bg-surface-2 text-gray-500"
                aria-label="Fermer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
            >
              {messages.length === 0 && !streaming && (
                <p className="text-sm text-gray-500 text-center mt-6">
                  Besoin d&apos;un coup de main ? Dis-moi ce qui te bloque, je te réponds ici sans quitter ton écran.
                </p>
              )}
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] bg-accent text-white rounded-card px-3 py-2 text-sm whitespace-pre-wrap">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex justify-start">
                    <div className="max-w-[85%] bg-surface-1 border border-gray-200 rounded-card px-3 py-2 text-sm text-gray-900 whitespace-pre-wrap">
                      {m.content}
                    </div>
                  </div>
                )
              )}
              {streaming && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] bg-surface-1 border border-gray-200 rounded-card px-3 py-2 text-sm text-gray-900 whitespace-pre-wrap">
                    {streamBuffer || (
                      <span className="typing-dots">
                        <span />
                        <span />
                        <span />
                      </span>
                    )}
                  </div>
                </div>
              )}
              {error && (
                <div className="text-xs text-status-critical bg-status-critical-bg border border-status-critical/30 rounded-card p-2">
                  {error}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-gray-200">
              <div className="flex items-end gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  disabled={streaming}
                  placeholder="Un doute ? Une question ?"
                  className="flex-1 text-sm border border-gray-200 rounded-card px-3 py-2 bg-surface-1 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => send(input)}
                  disabled={streaming || !input.trim()}
                  className="shrink-0 h-9 w-9 rounded-card bg-accent hover:bg-accent-dark disabled:bg-gray-200 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
                  aria-label="Envoyer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 19V5" />
                    <path d="m5 12 7-7 7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
