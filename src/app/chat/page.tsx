"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { OniMessage } from "@/components/OniMessage";
import { UserMessage } from "@/components/UserMessage";
import { ChatInput } from "@/components/ChatInput";
import { SituationCards } from "@/components/SituationCards";
import { RecapCard } from "@/components/RecapCard";
import { PersonaAvatar } from "@/components/PersonaAvatar";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import type { ChatMessage, InteractionMode, OniGender } from "@/lib/types";

const ONI_INTRO_MALE = `Salut, moi c'est Oni. Je suis là pour t'aider à y voir clair sur ton activité et décider quoi faire ensuite.

Dis-moi ce qui te préoccupe en ce moment — ou clique une des situations en dessous si t'as pas envie d'écrire un pavé.`;

const ONI_INTRO_FEMALE = ONI_INTRO_MALE;

// Patterns naturels + le mot-clé RECAP prescrit dans le system prompt d'Oni.
const RECAP_PATTERNS = [
  /\brecap\b/i,
  /voilà ce que j'ai compris/i,
  /voici ce que j'ai compris/i,
  /voici ce que je retiens/i,
  /je te fais un (?:petit )?(?:récap|résumé)/i,
  /laisse-moi récapituler/i,
  /résumé de notre/i,
  /si j'ai bien compris/i,
  /pour résumer/i,
];

function detectRecap(text: string): string | null {
  const hit = RECAP_PATTERNS.some((re) => re.test(text));
  if (!hit) return null;
  // Prend tout le message comme récap — l'UI l'affiche avec les boutons de validation.
  return text.trim();
}

const STORAGE_KEY = "cogniwis:pending-conversation";

export default function ChatPage() {
  const router = useRouter();

  const [gender, setGender] = useState<OniGender>("il");
  const [mode, setMode] = useState<InteractionMode>("text");
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState("");
  const [recap, setRecap] = useState<string | null>(null);
  const [savingRecap, setSavingRecap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef<string>(new Date().toISOString());
  const voice = useVoiceInput("fr-FR");

  const handleModeChange = (next: InteractionMode) => {
    if ((next === "voice" || next === "mixed") && !voice.isSupported) {
      setError(
        "Ton navigateur ne supporte pas la reconnaissance vocale. Passe sur Chrome pour la voix."
      );
      return;
    }
    setError(null);
    if (voice.isListening) voice.stopListening();
    voice.resetTranscript();
    setMode(next);
  };

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
      setRecap(null); // toute nouvelle réponse invalide un récap précédent
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
        const detectedRecap = detectRecap(acc);
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

  const confirmRecap = () => {
    if (!recap) return;
    setSavingRecap(true);
    setError(null);

    // Flux sans inscription : on stocke la conversation en sessionStorage
    // puis on file droit au diagnostic. L'auth reste dispo pour plus tard.
    try {
      const payload = {
        messages,
        recap,
        startedAt: startedAt.current,
        oniGender: gender,
        interactionMode: mode,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      // Compat avec l'ancien flux signup qui lit localStorage.
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, recap }));
    } catch {
      // ignore quota
    }

    router.push("/diagnostic");
  };

  const editRecap = () => {
    setRecap(null);
    // On rend la main à l'utilisateur — il tape sa correction lui-même.
    setTimeout(() => {
      const input = document.querySelector<HTMLTextAreaElement>(
        "textarea, input[type='text']"
      );
      input?.focus();
    }, 50);
  };

  return (
    <div className="relative min-h-screen bg-surface overflow-hidden">
      {!started && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(50% 35% at 50% 0%, rgba(0,34,255,0.08), transparent 70%)",
          }}
        />
      )}
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
        {!started ? (
          <div className="flex flex-col items-center gap-10 pt-6">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-surface-1 border border-gray-200 text-xs font-medium text-gray-600 shadow-card">
              <span className="h-1.5 w-1.5 rounded-full bg-status-solid" />
              Session privée · sans compte
            </span>

            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl font-semibold text-gray-900 tracking-tight leading-[1.1]">
                Salut.
                <br />
                <span className="text-gray-400">On fait le point ?</span>
              </h1>
              <p className="mt-5 text-gray-600 max-w-md mx-auto leading-relaxed">
                Je suis Oni. En 5 minutes, on éclaircit ce qui coince et
                j&apos;isole une seule action utile à lancer aujourd&apos;hui.
              </p>
            </div>

            {/* Persona picker */}
            <div>
              <div className="text-center text-xs uppercase tracking-[0.16em] text-gray-500 font-semibold mb-3">
                Choisis ton Oni
              </div>
              <div className="flex items-center justify-center gap-3">
                {(["il", "elle"] as const).map((g) => {
                  const selected = gender === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`group flex items-center gap-3 pl-2 pr-5 py-2 rounded-pill border transition-all ${
                        selected
                          ? "bg-accent-light border-accent shadow-card"
                          : "bg-surface-1 border-gray-200 hover:border-gray-300"
                      }`}
                      aria-pressed={selected}
                    >
                      <PersonaAvatar gender={g} size={44} />
                      <div className="text-left">
                        <div
                          className={`text-sm font-semibold ${
                            selected ? "text-accent-dark" : "text-gray-900"
                          }`}
                        >
                          {g === "il" ? "Il" : "Elle"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {g === "il" ? "Ton direct" : "Ton empathique"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input central + mode inline */}
            <div className="w-full max-w-2xl">
              {mode === "voice" ? (
                <VoiceStage
                  streaming={streaming}
                  voice={voice}
                  onSend={sendMessage}
                />
              ) : (
                <ChatInput
                  onSend={(msg) => {
                    sendMessage(msg);
                    voice.resetTranscript();
                  }}
                  disabled={streaming}
                  placeholder="Dis-moi ce qui te préoccupe…"
                  value={
                    mode === "mixed"
                      ? voice.transcript || inputValue
                      : inputValue
                  }
                  onValueChange={(v) => {
                    setInputValue(v);
                    if (mode === "mixed") voice.resetTranscript();
                  }}
                  voice={
                    mode === "mixed" && voice.isSupported
                      ? {
                          isListening: voice.isListening,
                          liveTranscript: voice.interim,
                          onToggle: () =>
                            voice.isListening
                              ? voice.stopListening()
                              : voice.startListening(),
                        }
                      : undefined
                  }
                />
              )}

              {/* Barre d'actions sous l'input : mode + hint */}
              <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                <InlineModePills
                  mode={mode}
                  onChange={handleModeChange}
                  voiceSupported={voice.isSupported}
                />
                <p className="text-xs text-gray-400">
                  {mode === "voice"
                    ? "Clique le micro pour parler, reclique pour envoyer."
                    : "Entrée pour envoyer · Maj + Entrée pour aller à la ligne"}
                </p>
              </div>
            </div>

            {/* Suggestions chips */}
            <div className="w-full">
              <div className="text-center text-xs uppercase tracking-[0.16em] text-gray-500 font-semibold mb-3">
                Ou clique ce qui te ressemble
              </div>
              <SituationCards onSelect={sendMessage} />
            </div>

            {/* Reveal détail : mode selector complet (pour ceux qui veulent voir) */}
            <details className="w-full max-w-2xl group">
              <summary className="cursor-pointer text-center text-xs text-gray-500 hover:text-gray-700 select-none list-none">
                <span className="inline-flex items-center gap-1.5">
                  <span>Comment ça marche</span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-transform group-open:rotate-180"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </summary>
              <div className="mt-4 bg-surface-1 border border-gray-200 rounded-2xl p-5 text-sm text-gray-600 space-y-2 shadow-card">
                <p>
                  <span className="font-semibold text-gray-900">
                    5 à 8 questions ciblées.
                  </span>{" "}
                  Pas un formulaire, une vraie discussion.
                </p>
                <p>
                  <span className="font-semibold text-gray-900">Un récap.</span>{" "}
                  Tu confirmes ce qu&apos;Oni a compris.
                </p>
                <p>
                  <span className="font-semibold text-gray-900">
                    Un diagnostic + une action.
                  </span>{" "}
                  Tes 7 piliers évalués, une seule chose à lancer aujourd&apos;hui.
                </p>
              </div>
            </details>
          </div>
        ) : (
          <div className="flex flex-col h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-5rem)]">
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <PersonaAvatar gender={gender} size={44} />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface ${
                      streaming ? "bg-accent animate-pulse" : "bg-status-solid"
                    }`}
                  />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 leading-tight">
                    Oni
                  </div>
                  <div className="text-xs text-gray-500">
                    {streaming ? "Écrit…" : "En ligne · Cogniwis"}
                  </div>
                </div>
              </div>
              <InlineModePills
                mode={mode}
                onChange={handleModeChange}
                voiceSupported={voice.isSupported}
                compact
              />
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
              {mode === "voice" && !recap ? (
                <VoiceStage
                  streaming={streaming || savingRecap}
                  voice={voice}
                  onSend={sendMessage}
                />
              ) : (
                <ChatInput
                  onSend={(msg) => {
                    sendMessage(msg);
                    voice.resetTranscript();
                  }}
                  disabled={streaming || savingRecap || !!recap}
                  placeholder={
                    recap
                      ? "Valide ou corrige le récap ci-dessus pour continuer…"
                      : undefined
                  }
                  value={
                    mode === "mixed"
                      ? voice.transcript || inputValue
                      : inputValue
                  }
                  onValueChange={(v) => {
                    setInputValue(v);
                    if (mode === "mixed") voice.resetTranscript();
                  }}
                  voice={
                    mode === "mixed" && voice.isSupported && !recap
                      ? {
                          isListening: voice.isListening,
                          liveTranscript: voice.interim,
                          onToggle: () =>
                            voice.isListening
                              ? voice.stopListening()
                              : voice.startListening(),
                        }
                      : undefined
                  }
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface InlineModePillsProps {
  mode: InteractionMode;
  onChange: (m: InteractionMode) => void;
  voiceSupported: boolean;
  compact?: boolean;
}

function InlineModePills({
  mode,
  onChange,
  voiceSupported,
  compact = false,
}: InlineModePillsProps) {
  const MODES: { id: InteractionMode; label: string; needsVoice: boolean }[] = [
    { id: "text", label: "Écrire", needsVoice: false },
    { id: "mixed", label: "Mixte", needsVoice: true },
    { id: "voice", label: "Parler", needsVoice: true },
  ];
  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-pill bg-surface-1 border border-gray-200 p-0.5 shadow-card ${
        compact ? "text-[11px]" : "text-xs"
      }`}
    >
      {MODES.map((m) => {
        const disabled = m.needsVoice && !voiceSupported;
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(m.id)}
            title={
              disabled
                ? "Reconnaissance vocale non supportée par ce navigateur"
                : undefined
            }
            className={`px-3 py-1 rounded-pill font-medium transition-colors ${
              active
                ? "bg-accent text-white shadow-card"
                : disabled
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-600 hover:bg-surface-2"
            }`}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

interface VoiceStageProps {
  streaming: boolean;
  voice: ReturnType<typeof useVoiceInput>;
  onSend: (msg: string) => void;
}

function VoiceStage({ streaming, voice, onSend }: VoiceStageProps) {
  const handleClick = () => {
    if (streaming) return;
    if (voice.isListening) {
      voice.stopListening();
      const text = (voice.transcript + " " + voice.interim).trim();
      if (text) {
        onSend(text);
        voice.resetTranscript();
      }
    } else {
      voice.startListening();
    }
  };

  const live = (voice.transcript + " " + voice.interim).trim();

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {live && (
        <div className="w-full max-w-xl bg-surface-1 border border-gray-200 rounded-card p-3 text-sm text-gray-700 italic">
          {live}
        </div>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={streaming}
        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all text-white ${
          voice.isListening
            ? "bg-red-500 animate-pulse scale-105"
            : "bg-accent hover:bg-accent-dark hover:scale-105"
        } disabled:bg-gray-300 disabled:cursor-not-allowed`}
        aria-label={voice.isListening ? "Envoyer" : "Parler"}
      >
        {voice.isListening ? (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        )}
      </button>
      <p className="text-sm text-gray-500">
        {voice.isListening
          ? "Je t'écoute… Clique pour envoyer"
          : "Clique pour parler"}
      </p>
    </div>
  );
}
