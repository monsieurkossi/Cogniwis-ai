"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OniAvatar } from "@/components/OniAvatar";
import { OniMessage } from "@/components/OniMessage";
import { UserMessage } from "@/components/UserMessage";
import { ChatInput } from "@/components/ChatInput";
import { SituationCards } from "@/components/SituationCards";
import { WhatHappensNext } from "@/components/WhatHappensNext";
import { RecapCard } from "@/components/RecapCard";
import { CogniwisLogo } from "@/components/CogniwisLogo";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import type { ChatMessage, InteractionMode, OniGender } from "@/lib/types";

const ONI_INTRO_MALE = `Bienvenue. Je suis Oni, ton conseiller Cogniwis. Objectif de cette session : clarifier ta situation et identifier la prochaine décision à prendre.

Commence par décrire ce qui te préoccupe. Une des situations proposées peut aussi servir de point de départ.`;

const ONI_INTRO_FEMALE = ONI_INTRO_MALE;

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
    if (!started) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streamBuffer, recap, started]);

  const intro = gender === "elle" ? ONI_INTRO_FEMALE : ONI_INTRO_MALE;

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

  // ============================================================
  // Un seul layout — deux états. Transition douce via CSS.
  // ============================================================
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header — fusionne brand + statut Oni, se compacte quand démarré */}
      <header
        className={`sticky top-0 z-20 bg-surface/85 backdrop-blur border-b border-gray-200/60 transition-all ${
          started ? "py-3" : "py-4"
        }`}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Link href="/" aria-label="Cogniwis — accueil">
              <CogniwisLogo size={28} />
            </Link>
            {started && (
              <>
                <span className="text-gray-300">/</span>
                <div className="flex items-center gap-2">
                  <OniAvatar size={26} speaking={streaming} />
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 text-[13.5px] leading-tight">
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
              </>
            )}
          </div>

          {started ? (
            <InlineModePills
              mode={mode}
              onChange={handleModeChange}
              voiceSupported={voice.isSupported}
              compact
            />
          ) : (
            <Link
              href="/auth/login"
              className="text-xs font-medium px-3 py-1.5 rounded-pill border border-gray-200 text-gray-700 hover:bg-surface-2 transition-colors"
            >
              Se connecter
            </Link>
          )}
        </div>
      </header>

      {/* Zone centrale scrollable */}
      <main className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="max-w-2xl mx-auto w-full px-4 sm:px-6">
          {/* HERO — visible tout le temps mais l'avatar shrink */}
          <div
            className={`flex flex-col items-center text-center transition-all duration-500 ease-out ${
              started ? "pt-4 pb-2" : "pt-10 sm:pt-14 pb-6"
            }`}
          >
            <div
              className={`transition-all duration-500 ease-out ${
                started
                  ? "scale-0 h-0 opacity-0 overflow-hidden"
                  : "scale-100 opacity-100"
              }`}
              aria-hidden={started}
            >
              <OniAvatar size={112} halo />
              <h1 className="mt-8 font-display font-semibold text-gray-900 tracking-[-0.03em] leading-[1] text-[38px] sm:text-[52px]">
                Bonjour, moi c&apos;est{" "}
                <span className="bg-gradient-to-br from-accent to-accent-dark bg-clip-text text-transparent">
                  Oni
                </span>
                .
              </h1>
              <p className="mt-4 text-[15px] sm:text-[16px] text-gray-500 max-w-md mx-auto leading-relaxed">
                Ton conseiller stratégique. On va faire le point sur ton
                activité en 5 minutes, sans jargon.
              </p>

              {/* Il / Elle + mode selector — compacts, en ligne */}
              <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-1 rounded-pill border border-gray-200 bg-white/80 backdrop-blur p-0.5 text-xs">
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
          </div>

          {/* Contenu welcome (timeline + cards) — slide up + fade out quand démarré */}
          <div
            className={`transition-all duration-500 ease-out ${
              started
                ? "opacity-0 -translate-y-4 max-h-0 overflow-hidden pointer-events-none"
                : "opacity-100 translate-y-0 max-h-[2000px]"
            }`}
            aria-hidden={started}
          >
            <div className="mt-4">
              <WhatHappensNext />
            </div>

            <div className="mt-6">
              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400 text-center mb-3 font-semibold">
                Ou choisis un point de départ
              </p>
              <SituationCards onSelect={sendMessage} />
            </div>

            {/* Espace avant l'input pour respirer */}
            <div className="h-6" />
          </div>

          {/* Fil de messages — visible dès qu'on démarre */}
          {started && (
            <div className="pt-6 pb-24 space-y-6">
              <OniMessage content={intro} />
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
          )}
        </div>
      </main>

      {/* Input — TOUJOURS en bas, au même endroit dans les deux états */}
      <div className="sticky bottom-0 z-20 bg-surface/85 backdrop-blur border-t border-gray-200/60">
        <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-3 sm:py-4">
          {mode === "voice" && !recap ? (
            <VoiceStage
              streaming={streaming || savingRecap}
              voice={voice}
              onSend={sendMessage}
            />
          ) : (
            <ChatInput
              hero
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
          <p className="mt-2 text-center text-[11px] text-gray-400">
            {started
              ? "Oni peut se tromper. Vérifie ce qui compte avant d'agir."
              : "Entrée pour envoyer · Session privée sur ton appareil"}
          </p>
        </div>
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
      className={`inline-flex items-center gap-0.5 rounded-pill bg-white/80 backdrop-blur border border-gray-200 p-0.5 ${
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
