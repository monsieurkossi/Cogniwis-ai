"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { OniAvatar } from "@/components/OniAvatar";
import { OniMessage } from "@/components/OniMessage";
import { UserMessage } from "@/components/UserMessage";
import { ChatInput } from "@/components/ChatInput";
import { SituationCards } from "@/components/SituationCards";
import { RecapCard } from "@/components/RecapCard";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import type { ChatMessage, InteractionMode, OniGender } from "@/lib/types";

const ONI_INTRO_MALE = `Bienvenue. Je suis Oni, ton conseiller Cogniwis. Objectif de cette session : clarifier ta situation et identifier la prochaine décision à prendre.

Commence par décrire ce qui te préoccupe. Une des situations proposées peut aussi servir de point de départ.`;

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
  // Compteurs pour le panneau contexte à droite. Le message d'intro d'Oni
  // compte pour 1 puisqu'il "démarre" la session, le stream courant aussi.
  const assistantTurns =
    messages.filter((m) => m.role === "assistant").length +
    1 +
    (streaming ? 1 : 0);
  const userTurns = messages.filter((m) => m.role === "user").length;

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
      <div className={`${started ? "max-w-6xl" : "max-w-3xl"} mx-auto px-4 py-6 sm:py-10`}>
        {!started ? (
          <div className="flex flex-col items-center gap-10 pt-6">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-surface-1 border border-gray-200 text-xs font-medium text-gray-600 shadow-card">
              <span className="h-1.5 w-1.5 rounded-full bg-status-solid" />
              Session privée · sans compte
            </span>

            <div className="flex flex-col items-center text-center">
              <OniAvatar size={112} />
              <h1 className="mt-8 text-4xl sm:text-5xl font-semibold text-gray-900 tracking-tight leading-[1.1]">
                Bienvenue.
                <br />
                <span className="text-accent">On analyse ta situation.</span>
              </h1>
              <p className="mt-5 text-gray-600 max-w-md mx-auto leading-relaxed">
                Session guidée avec Oni. Cinq à huit questions ciblées,
                puis un diagnostic et une action précise à exécuter dans
                la journée.
              </p>

              {/* Toggle de ton — pas un avatar, juste un choix de voix. */}
              <div className="mt-6 inline-flex items-center gap-1 rounded-pill border border-gray-200 bg-surface-1 p-0.5 text-xs shadow-card">
                <span className="pl-3 pr-1 text-gray-500">Oni parle au</span>
                {(["il", "elle"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`px-3 py-1 rounded-pill font-medium transition-colors ${
                      gender === g
                        ? "bg-gray-900 text-white shadow-card"
                        : "text-gray-600 hover:bg-surface-2"
                    }`}
                    aria-pressed={gender === g}
                  >
                    {g === "il" ? "masculin" : "féminin"}
                  </button>
                ))}
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
                    Questions ciblées.
                  </span>{" "}
                  Oni creuse jusqu&apos;à comprendre. Pas un formulaire, une
                  vraie discussion.
                </p>
                <p>
                  <span className="font-semibold text-gray-900">Un récap.</span>{" "}
                  Tu confirmes ce qu&apos;Oni a compris.
                </p>
                <p>
                  <span className="font-semibold text-gray-900">
                    Diagnostic + action.
                  </span>{" "}
                  Les 7 piliers évalués, une seule chose à lancer aujourd&apos;hui.
                </p>
              </div>
            </details>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_280px] gap-6 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-5rem)]">
            <div className="flex flex-col min-w-0 bg-surface-1 border border-gray-200 rounded-2xl shadow-card overflow-hidden">
              {/* Header conversation */}
              <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 bg-surface-1">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <OniAvatar size={36} speaking={streaming} />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-1 ${
                        streaming ? "bg-accent animate-pulse" : "bg-status-solid"
                      }`}
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 leading-tight">
                      Oni · session en cours
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-2">
                      <span>
                        {streaming
                          ? "Analyse en cours…"
                          : recap
                            ? "Récap prêt à valider"
                            : `${assistantTurns} question${assistantTurns > 1 ? "s" : ""} posée${assistantTurns > 1 ? "s" : ""}`}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-gray-300" />
                      <span>ton {gender === "il" ? "masculin" : "féminin"}</span>
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

              {/* Stream messages */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-5 py-6 space-y-6"
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

              <div className="px-5 pt-3 pb-4 border-t border-gray-100 bg-surface-1">
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

            {/* Side context panel (desktop only) */}
            <aside className="hidden lg:flex flex-col gap-4 h-full">
              <SessionPanel
                assistantTurns={assistantTurns}
                userTurns={userTurns}
                phase={recap ? "recap" : "collect"}
                startedAt={startedAt.current}
              />
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

interface SessionPanelProps {
  assistantTurns: number;
  userTurns: number;
  phase: "collect" | "recap";
  startedAt: string;
}

function SessionPanel({
  assistantTurns,
  userTurns,
  phase,
  startedAt,
}: SessionPanelProps) {
  const elapsedMin = Math.max(
    1,
    Math.round((Date.now() - new Date(startedAt).getTime()) / 60000)
  );
  return (
    <>
      <div className="rounded-2xl bg-surface-1 border border-gray-200 shadow-card p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] uppercase tracking-[0.16em] text-gray-500 font-semibold">
            Session en cours
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-pill text-[11px] font-medium ${
              phase === "recap"
                ? "bg-accent-light text-accent-dark border border-accent/30"
                : "bg-surface-2 text-gray-700 border border-gray-200"
            }`}
          >
            <span
              className={`h-1 w-1 rounded-full ${
                phase === "recap" ? "bg-accent" : "bg-gray-400"
              }`}
            />
            {phase === "recap" ? "Récapitulatif" : "Collecte"}
          </span>
        </div>
        <div className="mt-4 flex items-baseline justify-between">
          <div className="text-3xl font-semibold text-gray-900 leading-none">
            {assistantTurns}
          </div>
          <div className="text-[11px] text-gray-500">
            question{assistantTurns > 1 ? "s" : ""} posée{assistantTurns > 1 ? "s" : ""}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-[13px]">
          <Row label="Tes réponses">{userTurns}</Row>
          <Row label="Temps écoulé">≈ {elapsedMin} min</Row>
        </div>
      </div>

      <div className="rounded-2xl bg-surface-1 border border-gray-200 shadow-card p-5">
        <div className="text-[10px] uppercase tracking-[0.16em] text-gray-500 font-semibold">
          Objectif de la session
        </div>
        <ol className="mt-3 space-y-2.5 text-[13px] text-gray-700">
          {[
            "Comprendre ton activité et ton stade",
            "Identifier l'écart entre l'objectif déclaré et le vrai objectif",
            "Valider un récap avec toi",
            "Livrer diagnostic + action prioritaire",
          ].map((step, i) => {
            const done =
              phase === "recap" ? i < 3 : i === 0 && assistantTurns > 1;
            return (
              <li key={step} className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 h-4 w-4 shrink-0 rounded-full flex items-center justify-center ${
                    done
                      ? "bg-status-solid text-white"
                      : "bg-surface-2 text-gray-400 border border-gray-200"
                  }`}
                >
                  {done ? (
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span className="text-[10px] font-mono">{i + 1}</span>
                  )}
                </span>
                <span
                  className={
                    done ? "text-gray-500 line-through" : "text-gray-800"
                  }
                >
                  {step}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-accent-dark text-white p-5 shadow-card">
        <div className="text-[10px] uppercase tracking-[0.16em] text-white/60 font-semibold">
          Rappel méthode
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-white/85">
          Oni pose autant de questions que nécessaire pour scorer tes
          7 piliers. Il creuse quand un sujet reste flou, il ne redemande
          pas ce qu&apos;il peut déduire.
        </p>
      </div>
    </>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{children}</span>
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
