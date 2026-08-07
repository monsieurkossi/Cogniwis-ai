"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { OniAvatar } from "@/components/OniAvatar";
import { OniMessage } from "@/components/OniMessage";
import { UserMessage } from "@/components/UserMessage";
import { ChatInput } from "@/components/ChatInput";
import { SituationCards } from "@/components/SituationCards";
import { WhatHappensNext } from "@/components/WhatHappensNext";
import { RecapCard } from "@/components/RecapCard";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import type { ChatMessage, InteractionMode, OniGender } from "@/lib/types";

const ONI_INTRO = `Bienvenue. Je suis Oni, ton conseiller Cogniwis. Objectif de cette session : clarifier ta situation et identifier la prochaine décision à prendre.

Commence par décrire ce qui te préoccupe. Une des situations proposées peut aussi servir de point de départ.`;

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
  return text.trim();
}

const STORAGE_KEY = "cogniwis:pending-conversation";

export default function ChatPage() {
  const router = useRouter();

  const [gender, setGender] = useState<OniGender>("il");
  const [mode, setMode] = useState<InteractionMode>("text");
  const [userEmail, setUserEmail] = useState<string | null>(null);
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

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }, [router]);

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
    if (!started) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streamBuffer, recap, started]);

  const assistantTurns =
    messages.filter((m) => m.role === "assistant").length +
    1 +
    (streaming ? 1 : 0);
  const userTurns = messages.filter((m) => m.role === "user").length;

  const sendMessage = useCallback(
    async (content: string) => {
      setError(null);
      setRecap(null);
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
        if (!res.ok || !res.body) throw new Error(`Erreur ${res.status}`);
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
        if (detectedRecap) setRecap(detectedRecap);
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
    try {
      const payload = {
        messages,
        recap,
        startedAt: startedAt.current,
        oniGender: gender,
        interactionMode: mode,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, recap }));
    } catch {
      /* ignore quota */
    }
    router.push("/diagnostic");
  };

  const editRecap = () => {
    setRecap(null);
    setTimeout(() => {
      const input = document.querySelector<HTMLTextAreaElement>(
        "textarea, input[type='text']"
      );
      input?.focus();
    }, 50);
  };

  const rightPanel = started ? (
    <SessionRunningPanel
      assistantTurns={assistantTurns}
      userTurns={userTurns}
      phase={recap ? "recap" : "collect"}
      startedAt={startedAt.current}
    />
  ) : (
    <SessionsEmptyPanel />
  );

  return (
    <AppShell
      title="Chat"
      userEmail={userEmail}
      onSignOut={signOut}
      right={rightPanel}
    >
      <div className="h-full flex flex-col">
        {/* ============ ÉTAT WELCOME ============ */}
        {!started ? (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto w-full px-5 sm:px-6 pt-8 sm:pt-12 pb-4">
              {/* Hero */}
              <div className="text-center">
                <div className="inline-block">
                  <OniAvatar size={92} halo />
                </div>
                <h1 className="mt-6 font-display font-semibold text-gray-900 tracking-[-0.028em] leading-[1] text-[34px] sm:text-[44px]">
                  Bonjour, moi c&apos;est{" "}
                  <span className="text-accent">Oni</span>.
                </h1>
                <p className="mt-3 text-[14px] sm:text-[15px] text-gray-500 max-w-md mx-auto leading-relaxed">
                  Ton conseiller stratégique. On va faire le point sur ton
                  activité en 5 minutes, sans jargon.
                </p>

                {/* Pills Ton + Mode */}
                <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-1 rounded-pill border border-gray-200 bg-white p-0.5 text-[11px]">
                    <span className="pl-3 pr-1 text-gray-500">Ton</span>
                    {(["il", "elle"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`px-3 py-1 rounded-pill font-medium transition-colors ${
                          gender === g
                            ? "bg-gray-900 text-white"
                            : "text-gray-600 hover:bg-surface-2"
                        }`}
                        aria-pressed={gender === g}
                      >
                        {g === "il" ? "masculin" : "féminin"}
                      </button>
                    ))}
                  </div>
                  <InlineModePills
                    mode={mode}
                    onChange={handleModeChange}
                    voiceSupported={voice.isSupported}
                  />
                </div>
              </div>

              {/* Ce qui va se passer — variante C */}
              <div className="mt-8">
                <WhatHappensNext />
              </div>

              {/* Cartes situation */}
              <div className="mt-4">
                <SituationCards onSelect={sendMessage} />
              </div>
            </div>
          </div>
        ) : (
          // ============ ÉTAT CONVERSATION ============
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto"
          >
            {/* Sous-header conversation (Oni + statut) */}
            <div className="sticky top-0 z-10 bg-surface/90 backdrop-blur border-b border-gray-100">
              <div className="max-w-2xl mx-auto w-full px-5 sm:px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <OniAvatar size={28} speaking={streaming} />
                  <div>
                    <div className="text-[13px] font-semibold text-gray-900 leading-tight">
                      Oni
                    </div>
                    <div className="text-[10.5px] text-gray-500 flex items-center gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          streaming
                            ? "bg-accent animate-pulse"
                            : recap
                              ? "bg-status-fragile"
                              : "bg-status-solid"
                        }`}
                      />
                      <span>
                        {streaming
                          ? "réfléchit…"
                          : recap
                            ? "récap à valider"
                            : "en ligne"}
                      </span>
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
            </div>

            {/* Messages */}
            <div className="max-w-2xl mx-auto w-full px-5 sm:px-6 py-6 space-y-6">
              <OniMessage content={ONI_INTRO} />
              {messages.map((m, idx) =>
                m.role === "assistant" ? (
                  <OniMessage key={idx} content={m.content} />
                ) : (
                  <UserMessage key={idx} content={m.content} />
                )
              )}
              {streaming && <OniMessage content={streamBuffer} streaming />}
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
          </div>
        )}

        {/* ============ INPUT (identique dans les deux états) ============ */}
        <div className="shrink-0 border-t border-gray-100 bg-surface">
          <div className="max-w-2xl mx-auto w-full px-5 sm:px-6 py-3 sm:py-4">
            {mode === "voice" && !recap ? (
              <VoiceStage
                streaming={streaming || savingRecap}
                voice={voice}
                onSend={sendMessage}
              />
            ) : (
              <ChatInput
                emphasized={!started}
                onSend={(msg) => {
                  sendMessage(msg);
                  voice.resetTranscript();
                }}
                disabled={streaming || savingRecap || !!recap}
                placeholder={
                  recap
                    ? "Valide ou corrige le récap ci-dessus pour continuer…"
                    : started
                      ? "Écris ta réponse à Oni…"
                      : "Dis-moi ce qui te préoccupe…"
                }
                value={
                  mode === "mixed" ? voice.transcript || inputValue : inputValue
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
            <div className="text-center text-[10.5px] text-gray-400 mt-2">
              {started
                ? "Oni peut se tromper. Vérifie ce qui compte avant d'agir."
                : "Entrée pour envoyer · Session privée sur ton appareil"}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ============================================================
// Panneau droit — vide (accueil)
// ============================================================
function SessionsEmptyPanel() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-semibold text-gray-900">
          Sessions <span className="text-gray-400 font-normal">(0)</span>
        </div>
        <span className="text-gray-400 text-sm">···</span>
      </div>

      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-4 text-center">
        <div className="mx-auto h-9 w-9 rounded-full bg-accent-light text-accent-dark flex items-center justify-center text-[15px]">
          💬
        </div>
        <div className="mt-2 text-[12.5px] font-semibold text-gray-900">
          Aucune session
        </div>
        <div className="mt-1 text-[11px] text-gray-500 leading-relaxed">
          Elles apparaîtront ici après ta première conversation avec Oni.
        </div>
      </div>

      {/* Teaser grisé */}
      <div className="space-y-1 opacity-35 pointer-events-none">
        <PlaceholderItem title="Boulangerie · clients" sub="Écart offre / demande" />
        <PlaceholderItem title="Freelance dev" sub="Positionnement niche" />
        <PlaceholderItem title="Prix trop bas" sub="Reformuler l'offre" />
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-accent-dark text-white p-4">
        <div className="text-[10px] uppercase tracking-[0.14em] text-white/60 font-semibold">
          Bon à savoir
        </div>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/85">
          La session reste privée sur ton appareil tant que tu ne crées pas
          de compte.
        </p>
      </div>
    </div>
  );
}

function PlaceholderItem({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="px-2 py-2 rounded-lg">
      <div className="text-[12px] font-semibold text-gray-900 leading-tight">
        {title}
      </div>
      <div className="text-[10.5px] text-gray-400">{sub}</div>
    </div>
  );
}

// ============================================================
// Panneau droit — session en cours
// ============================================================
interface SessionRunningPanelProps {
  assistantTurns: number;
  userTurns: number;
  phase: "collect" | "recap";
  startedAt: string;
}

function SessionRunningPanel({
  assistantTurns,
  userTurns,
  phase,
  startedAt,
}: SessionRunningPanelProps) {
  const elapsedMin = Math.max(
    1,
    Math.round((Date.now() - new Date(startedAt).getTime()) / 60000)
  );
  const currentStep = phase === "recap" ? 3 : Math.min(assistantTurns, 2);

  const STEPS = [
    "Comprendre l'activité",
    "Identifier l'écart",
    "Valider un récap",
    "Diagnostic + action",
  ];

  return (
    <div className="space-y-4">
      <div className="text-[12px] font-semibold text-gray-900">
        Session en cours
      </div>

      <div className="rounded-2xl bg-white border border-gray-200 shadow-card p-4">
        <div className="flex items-baseline justify-between">
          <div className="text-3xl font-semibold text-gray-900 leading-none">
            {assistantTurns}
          </div>
          <div className="text-[10px] text-gray-500 uppercase tracking-[0.14em] font-semibold">
            {phase === "recap" ? "Récap" : "Collecte"}
          </div>
        </div>
        <div className="mt-1 text-[10.5px] text-gray-500">
          question{assistantTurns > 1 ? "s" : ""} posée{assistantTurns > 1 ? "s" : ""}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 text-[11.5px]">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Tes réponses</span>
            <span className="text-gray-900 font-semibold">{userTurns}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Temps écoulé</span>
            <span className="text-gray-900 font-semibold">≈ {elapsedMin} min</span>
          </div>
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-[0.14em] text-gray-400 font-semibold mb-2 px-1">
          Étapes
        </div>
        <div className="space-y-1.5 px-1">
          {STEPS.map((step, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <div key={step} className="flex items-start gap-2.5 text-[11.5px]">
                <span
                  className={`mt-0.5 h-4 w-4 shrink-0 rounded-full flex items-center justify-center text-[9px] font-semibold ${
                    done
                      ? "bg-status-solid text-white"
                      : active
                        ? "bg-accent text-white"
                        : "bg-white border border-gray-200 text-gray-400"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span
                  className={
                    done
                      ? "text-gray-400 line-through"
                      : active
                        ? "text-gray-900 font-medium"
                        : "text-gray-600"
                  }
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Mode pills (Écrire / Mixte / Parler)
// ============================================================
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
      className={`inline-flex items-center gap-0.5 rounded-pill bg-white border border-gray-200 p-0.5 ${
        compact ? "text-[10.5px]" : "text-[11px]"
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
                ? "bg-accent text-white"
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

// ============================================================
// Mode vocal
// ============================================================
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
    <div className="flex flex-col items-center gap-3 py-2">
      {live && (
        <div className="w-full max-w-xl bg-white border border-gray-200 rounded-card p-3 text-sm text-gray-700 italic">
          {live}
        </div>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={streaming}
        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all text-white ${
          voice.isListening
            ? "bg-red-500 animate-pulse scale-105"
            : "bg-accent hover:bg-accent-dark hover:scale-105"
        } disabled:bg-gray-300 disabled:cursor-not-allowed`}
        aria-label={voice.isListening ? "Envoyer" : "Parler"}
      >
        {voice.isListening ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        )}
      </button>
      <p className="text-xs text-gray-500">
        {voice.isListening
          ? "Je t'écoute… Clique pour envoyer"
          : "Clique pour parler"}
      </p>
    </div>
  );
}
