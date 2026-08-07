"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { OniAvatar } from "@/components/OniAvatar";
import { OniMessage } from "@/components/OniMessage";
import { UserMessage } from "@/components/UserMessage";
import { ChatInput } from "@/components/ChatInput";
import { SituationCards } from "@/components/SituationCards";
import { RecapCard } from "@/components/RecapCard";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
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
  const [userEmail, setUserEmail] = useState<string | null>(null);

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

  const rightPanel = started ? (
    <SessionPanel
      assistantTurns={assistantTurns}
      userTurns={userTurns}
      phase={recap ? "recap" : "collect"}
      startedAt={startedAt.current}
    />
  ) : (
    <WelcomeSidePanel />
  );

  return (
    <AppShell userEmail={userEmail} onSignOut={signOut} right={rightPanel}>
    <div className="relative min-h-full bg-surface overflow-hidden">
      {!started && (
        <>
          {/* Halo doux en haut, plus large et plus profond */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[640px] -z-10"
            style={{
              background:
                "radial-gradient(60% 55% at 50% 8%, rgba(0,34,255,0.14), rgba(0,34,255,0.04) 45%, transparent 75%)",
            }}
          />
          {/* Grain subtil pour donner de la matière */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
            }}
          />
        </>
      )}
      <div className={`${started ? "max-w-4xl" : "max-w-3xl"} mx-auto px-4 py-6 sm:py-10`}>
        {!started ? (
          <div className="flex flex-col items-center gap-8 pt-6 sm:pt-10">
            <div className="flex flex-col items-center text-center">
              <OniAvatar size={132} halo />
              <h1 className="mt-10 text-[34px] sm:text-[46px] font-semibold text-gray-900 tracking-tight leading-[1.05]">
                Comment puis-je
                <br />
                <span className="bg-gradient-to-r from-accent to-accent-dark bg-clip-text text-transparent">
                  t&apos;aider aujourd&apos;hui ?
                </span>
              </h1>
              <p className="mt-4 text-[15px] sm:text-base text-gray-500 max-w-md mx-auto leading-relaxed">
                Je suis Oni. Décris ce qui te préoccupe — je pose des
                questions ciblées, puis je te livre un diagnostic et une
                action précise à exécuter aujourd&apos;hui.
              </p>

              {/* Toggle de ton — plus discret */}
              <div className="mt-6 inline-flex items-center gap-1 rounded-pill border border-gray-200 bg-white/80 backdrop-blur p-0.5 text-xs shadow-card">
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

            {/* Input central — hero 3D */}
            <div className="w-full max-w-2xl">
              {mode === "voice" ? (
                <VoiceStage
                  streaming={streaming}
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

            {/* Suggestions chips 3D */}
            <div className="w-full">
              <div className="text-center text-[11px] uppercase tracking-[0.18em] text-gray-400 font-semibold mb-4">
                Ou choisis un point de départ
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
          <div className="h-[calc(100vh-4rem)]">
            {/* Colonne conversation — plate, sans carte, façon ChatGPT/Claude */}
            <div className="flex flex-col h-full min-w-0 relative">
              {/* Header compact */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-200/60">
                <div className="flex items-center gap-3">
                  <OniAvatar size={34} speaking={streaming} />
                  <div>
                    <div className="font-semibold text-gray-900 leading-tight text-[15px]">
                      Oni
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
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

              {/* Fil de messages */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto py-6 space-y-6 pr-1"
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

              {/* Input — collé en bas, sur fond surface, avec fade-out au-dessus */}
              <div className="relative pt-2">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-8 inset-x-0 h-8 bg-gradient-to-b from-transparent to-[color:var(--color-surface)]"
                />
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
                <p className="mt-2 text-center text-[11px] text-gray-400">
                  Oni peut se tromper. Vérifie ce qui compte avant d&apos;agir.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </AppShell>
  );
}

/** Panneau droit affiché sur la welcome — invite au démarrage. */
function WelcomeSidePanel() {
  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-gray-500 font-semibold">
          Ta session
        </div>
        <div className="mt-3 rounded-2xl border border-dashed border-gray-300 bg-white/60 p-5 text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-accent-light text-accent-dark flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="mt-3 text-sm font-semibold text-gray-900">
            Aucune session en cours
          </div>
          <p className="mt-1 text-[12px] text-gray-500 leading-relaxed">
            Décris ta situation ou choisis un point de départ pour lancer un
            diagnostic avec Oni.
          </p>
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-gray-500 font-semibold mb-3">
          Ce qui va se passer
        </div>
        <ol className="space-y-2.5 text-[13px] text-gray-700">
          {[
            "Oni pose 5 à 8 questions ciblées",
            "Il te propose un récap à valider",
            "Tu reçois un diagnostic sur 7 piliers",
            "Une seule action est priorisée pour aujourd'hui",
          ].map((step, i) => (
            <li key={step} className="flex items-start gap-2.5">
              <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-surface-2 text-gray-500 text-[10px] font-semibold flex items-center justify-center border border-gray-200">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-accent-dark text-white p-4 shadow-card">
        <div className="text-[10px] uppercase tracking-[0.18em] text-white/60 font-semibold">
          Bon à savoir
        </div>
        <p className="mt-2 text-[12.5px] leading-relaxed text-white/85">
          La session reste privée sur ton appareil tant que tu ne crées pas
          de compte. Tu peux partir de rien : Oni s&apos;adapte.
        </p>
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
