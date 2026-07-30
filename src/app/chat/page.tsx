"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { OniAvatar } from "@/components/OniAvatar";
import { OniMessage } from "@/components/OniMessage";
import { UserMessage } from "@/components/UserMessage";
import { ChatInput } from "@/components/ChatInput";
import { ModeSelector } from "@/components/ModeSelector";
import { SituationCards } from "@/components/SituationCards";
import { RecapCard } from "@/components/RecapCard";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage, InteractionMode, OniGender } from "@/lib/types";

const ONI_INTRO_MALE = `Salut, moi c'est Oni. Je suis là pour t'aider à y voir clair sur ton activité et décider quoi faire ensuite.

Dis-moi ce qui te préoccupe en ce moment — ou clique une des situations en dessous si t'as pas envie d'écrire un pavé.`;

const ONI_INTRO_FEMALE = `Salut, moi c'est Oni. Je suis là pour t'aider à y voir clair sur ton activité et décider quoi faire ensuite.

Dis-moi ce qui te préoccupe en ce moment — ou clique une des situations en dessous si t'as pas envie d'écrire un pavé.`;

function extractRecap(text: string): string | null {
  const match = text.match(/RECAP[\s\S]*?(?=\n\n|$)/i);
  if (!match) return null;
  return match[0].trim();
}

export default function ChatPage() {
  const router = useRouter();
  const supabase = createClient();

  const [gender, setGender] = useState<OniGender>("il");
  const [mode, setMode] = useState<InteractionMode>("text");
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState("");
  const [recap, setRecap] = useState<string | null>(null);
  const [savingRecap, setSavingRecap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streamBuffer, recap]);

  const intro = gender === "elle" ? ONI_INTRO_FEMALE : ONI_INTRO_MALE;

  const sendMessage = useCallback(
    async (content: string) => {
      setError(null);
      const nextMessages: ChatMessage[] = [
        ...messages,
        { role: "user", content, timestamp: new Date().toISOString() },
      ];
      setMessages(nextMessages);
      setStarted(true);
      setStreaming(true);
      setStreamBuffer("");

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: nextMessages }),
        });
        if (!res.ok || !res.body) {
          throw new Error(`Erreur ${res.status}`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          acc += chunk;
          setStreamBuffer(acc);
        }
        const finalMessages: ChatMessage[] = [
          ...nextMessages,
          { role: "assistant", content: acc, timestamp: new Date().toISOString() },
        ];
        setMessages(finalMessages);
        setStreamBuffer("");
        const detectedRecap = extractRecap(acc);
        if (detectedRecap) {
          setRecap(detectedRecap);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inattendue");
      } finally {
        setStreaming(false);
      }
    },
    [messages]
  );

  const confirmRecap = async () => {
    if (!recap) return;
    setSavingRecap(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      try {
        localStorage.setItem(
          "cogniwis:pending-conversation",
          JSON.stringify({ messages, recap })
        );
      } catch {
        // ignore quota
      }
      router.push("/auth/signup?redirectTo=/diagnostic");
      return;
    }

    const { data: convo, error: convoErr } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        messages,
        recap,
        status: "diagnostic_ready",
      })
      .select("id")
      .single();

    if (convoErr || !convo) {
      setError(convoErr?.message ?? "Impossible de sauvegarder la conversation");
      setSavingRecap(false);
      return;
    }

    router.push(`/diagnostic?conversation=${convo.id}`);
  };

  const editRecap = () => {
    setRecap(null);
    sendMessage(
      "En fait, j'ai un point à corriger dans le récap. Repose-moi la question là-dessus."
    );
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
        {!started ? (
          <div className="space-y-8">
            <div className="flex flex-col items-center text-center">
              <OniAvatar size={140} />
              <h1 className="mt-6 text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">
                Bonjour, moi c&apos;est Oni.
              </h1>
              <p className="mt-2 text-gray-600 max-w-md">
                Ton conseiller stratégique. On va faire le point sur ton activité
                en 5 minutes, sans jargon.
              </p>

              <div className="mt-4 inline-flex items-center gap-1 bg-surface-1 border border-gray-200 rounded-pill p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setGender("il")}
                  className={`px-3 py-1 rounded-pill transition-colors ${
                    gender === "il"
                      ? "bg-accent text-white"
                      : "text-gray-600 hover:bg-surface-2"
                  }`}
                >
                  Il
                </button>
                <button
                  type="button"
                  onClick={() => setGender("elle")}
                  className={`px-3 py-1 rounded-pill transition-colors ${
                    gender === "elle"
                      ? "bg-accent text-white"
                      : "text-gray-600 hover:bg-surface-2"
                  }`}
                >
                  Elle
                </button>
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">
                Comment veux-tu échanger ?
              </div>
              <ModeSelector mode={mode} onChange={setMode} />
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">
                Ou dis-moi juste ce qui coince
              </div>
              <SituationCards onSelect={sendMessage} />
            </div>

            <div>
              <ChatInput onSend={sendMessage} disabled={streaming} />
              <p className="text-xs text-gray-400 mt-2 text-center">
                Entrée pour envoyer · Maj + Entrée pour aller à la ligne
              </p>
            </div>

            <div className="bg-surface-1 border border-gray-200 rounded-card p-4 text-sm text-gray-600">
              <span className="font-semibold text-gray-900">Comment ça marche.</span>{" "}
              5 à 8 questions, un récap, puis un diagnostic complet de tes 7
              piliers et une première action à lancer aujourd&apos;hui.
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-5rem)]">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
              <OniAvatar size={40} speaking={streaming} />
              <div>
                <div className="font-semibold text-gray-900">Oni</div>
                <div className="text-xs text-status-solid">
                  {streaming ? "Écrit…" : "En ligne"}
                </div>
              </div>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto py-6 space-y-5"
            >
              <OniMessage content={intro} />
              {messages.map((m, idx) =>
                m.role === "assistant" ? (
                  <OniMessage key={idx} content={m.content} />
                ) : (
                  <UserMessage key={idx} content={m.content} />
                )
              )}
              {streaming && (
                <OniMessage content={streamBuffer} streaming />
              )}
              {recap && !streaming && (
                <RecapCard
                  recap={recap}
                  onConfirm={confirmRecap}
                  onEdit={editRecap}
                  loading={savingRecap}
                />
              )}
              {error && (
                <div className="text-sm text-status-critical bg-status-critical-bg border border-status-critical/30 rounded-card p-3">
                  {error}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-200">
              <ChatInput
                onSend={sendMessage}
                disabled={streaming || savingRecap}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
