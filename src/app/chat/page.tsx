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
  const [showHowItWorks, setShowHowItWorks] = useState(false);
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
          <div className="flex-1 flex flex-col justify-center overflow-y-auto">
            <div className="max-w-xl mx-auto w-full px-6 py-10">
              {/* Hero — mark + serif greeting + subtitle */}
              <div className="text-center">
                <OniAvatar size={44} />
                <h1 className="mt-6 font-serif text-[38px] sm:text-[46px] leading-[1.05] text-gray-900">
                  Bonjour. Je suis{" "}
                  <span className="italic text-accent">Oni</span>.
                </h1>
                <p className="mt-3 text-[14.5px] text-gray-500 max-w-md mx-auto leading-relaxed">
                  Décris ce qui te préoccupe. Je pose 5&nbsp;à&nbsp;8 questions
                  ciblées, puis je te livre un diagnostic et une action précise
                  à exécuter aujourd&apos;hui.
                </p>
              </div>

              {/* Input focal */}
              <div className="mt-8">
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
              </div>

              {/* Chips typographiques — points de départ */}
              <div className="mt-4">
                <SituationCards onSelect={sendMessage} />
              </div>

              {/* Barre utilitaire discrète en pied */}
              <div className="mt-10 flex items-center justify-center gap-3 flex-wrap text-[11.5px] text-gray-400">
                <ToneDropdown value={gender} onChange={setGender} />
                <span className="text-gray-200">·</span>
                <ModeDropdown
                  value={mode}
                  onChange={handleModeChange}
                  voiceSupported={voice.isSupported}
                />
                <span className="text-gray-200">·</span>
                <button
                  type="button"
                  onClick={() => setShowHowItWorks(true)}
                  className="hover:text-gray-700 underline decoration-gray-200 underline-offset-4 hover:decoration-gray-400 transition-colors"
                >
                  Comment ça marche
                </button>
              </div>

              {error && (
                <div className="mt-4 text-[12px] text-status-critical bg-status-critical-bg border border-status-critical/30 rounded-lg p-3 text-center">
                  {error}
                </div>
              )}
            </div>
          </div>
        ) : (
          // ============ ÉTAT CONVERSATION ============
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
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
                <ModeDropdown
                  value={mode}
                  onChange={handleModeChange}
                  voiceSupported={voice.isSupported}
                  compact
                />
              </div>
            </div>

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

        {/* Input persistant en bas — uniquement en mode conversation */}
        {started && (
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
                  onSend={(msg) => {
                    sendMessage(msg);
                    voice.resetTranscript();
                  }}
                  disabled={streaming || savingRecap || !!recap}
                  placeholder={
                    recap
                      ? "Valide ou corrige le récap ci-dessus pour continuer…"
                      : "Écris ta réponse à Oni…"
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
              <div className="text-center text-[10.5px] text-gray-400 mt-2">
                Oni peut se tromper. Vérifie ce qui compte avant d&apos;agir.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal "Comment ça marche" */}
      {showHowItWorks && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={() => setShowHowItWorks(false)}
        >
          <div
            className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-md w-full p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2">
              <div className="text-[13px] font-semibold text-gray-900">
                Comment ça marche
              </div>
              <button
                type="button"
                onClick={() => setShowHowItWorks(false)}
                className="h-7 w-7 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-surface-2 flex items-center justify-center"
                aria-label="Fermer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <WhatHappensNext />
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ============================================================
// Dropdowns discrets
// ============================================================
function ToneDropdown({
  value,
  onChange,
}: {
  value: OniGender;
  onChange: (g: OniGender) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = value === "il" ? "masculin" : "féminin";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 hover:text-gray-700 transition-colors"
      >
        <span>Oni parle au {label}</span>
        <Chevron open={open} />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-20 bg-white border border-gray-200 rounded-lg shadow-lg p-1 min-w-[120px]">
            {(["il", "elle"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  onChange(g);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 rounded-md text-[12px] transition-colors ${
                  value === g
                    ? "bg-accent-light text-accent-dark font-medium"
                    : "text-gray-700 hover:bg-surface-2"
                }`}
              >
                {g === "il" ? "masculin" : "féminin"}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ModeDropdown({
  value,
  onChange,
  voiceSupported,
  compact = false,
}: {
  value: InteractionMode;
  onChange: (m: InteractionMode) => void;
  voiceSupported: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const MODES: { id: InteractionMode; label: string; needsVoice: boolean }[] = [
    { id: "text", label: "Écrire", needsVoice: false },
    { id: "mixed", label: "Mixte", needsVoice: true },
    { id: "voice", label: "Parler", needsVoice: true },
  ];
  const current = MODES.find((m) => m.id === value) ?? MODES[0];

  if (compact) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-[10.5px] text-gray-500 hover:text-gray-900 border border-gray-200 rounded-full px-3 py-1 hover:bg-surface-2 transition-colors"
        >
          <span>{current.label}</span>
          <Chevron open={open} />
        </button>
        {open && (
          <ModeMenu
            modes={MODES}
            value={value}
            voiceSupported={voiceSupported}
            onSelect={(m) => {
              onChange(m);
              setOpen(false);
            }}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 hover:text-gray-700 transition-colors"
      >
        <span>Mode {current.label.toLowerCase()}</span>
        <Chevron open={open} />
      </button>
      {open && (
        <ModeMenu
          modes={MODES}
          value={value}
          voiceSupported={voiceSupported}
          onSelect={(m) => {
            onChange(m);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function ModeMenu({
  modes,
  value,
  voiceSupported,
  onSelect,
  onClose,
}: {
  modes: { id: InteractionMode; label: string; needsVoice: boolean }[];
  value: InteractionMode;
  voiceSupported: boolean;
  onSelect: (m: InteractionMode) => void;
  onClose: () => void;
}) {
  return (
    <>
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        className="fixed inset-0 z-10"
        onClick={onClose}
      />
      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-20 bg-white border border-gray-200 rounded-lg shadow-lg p-1 min-w-[120px]">
        {modes.map((m) => {
          const disabled = m.needsVoice && !voiceSupported;
          return (
            <button
              key={m.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(m.id)}
              className={`w-full text-left px-3 py-1.5 rounded-md text-[12px] transition-colors ${
                value === m.id
                  ? "bg-accent-light text-accent-dark font-medium"
                  : disabled
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-700 hover:bg-surface-2"
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>
    </>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
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
      </div>

      <div className="rounded-xl border border-dashed border-gray-200 bg-white/50 p-4 text-center">
        <div className="text-[12.5px] font-medium text-gray-900">
          Aucune session
        </div>
        <div className="mt-1 text-[11px] text-gray-500 leading-relaxed">
          Elles apparaîtront ici après ta première conversation avec Oni.
        </div>
      </div>
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

      <div className="rounded-xl bg-white border border-gray-200 p-4">
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
