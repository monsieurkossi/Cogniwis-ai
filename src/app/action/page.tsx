"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { OniAvatar } from "@/components/OniAvatar";
import { OniMessage } from "@/components/OniMessage";
import { ProgressStepper } from "@/components/ProgressStepper";
import { ActionCard } from "@/components/ActionCard";
import { DeliverableCard } from "@/components/DeliverableCard";
import { OniFab } from "@/components/OniFab";
import { createClient } from "@/lib/supabase/client";
import type { Action, ClientTouch, Diagnostic } from "@/lib/types";
import type { VerbatimAnalysis } from "@/app/api/analyze-verbatims/route";
import type { StepperStep } from "@/components/ProgressStepper";

const DIAG_STORAGE_KEY = "cogniwis:diagnostic";
const ACTION_STORAGE_KEY = "cogniwis:action";

function ActionInner() {
  const params = useSearchParams();
  const router = useRouter();
  const diagnosticId = params.get("diagnostic");
  const [action, setAction] = useState<Action | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [allSent, setAllSent] = useState(false);
  const [showVerbatimForm, setShowVerbatimForm] = useState(false);
  const [remindLater, setRemindLater] = useState(false);
  const [verbatims, setVerbatims] = useState<Record<string, string>>({});
  const [notYet, setNotYet] = useState<Record<string, boolean>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<VerbatimAnalysis | null>(
    null
  );
  const [continued, setContinued] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      // 1. Action déjà en cache
      try {
        const cached = sessionStorage.getItem(ACTION_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as Action;
          if (!cancelled) {
            setAction(parsed);
            setLoading(false);
            return;
          }
        }
      } catch {}

      // 2. Diagnostic anonyme en sessionStorage → mode payload direct
      let anonDiag: Diagnostic | null = null;
      try {
        const raw = sessionStorage.getItem(DIAG_STORAGE_KEY);
        if (raw) anonDiag = JSON.parse(raw) as Diagnostic;
      } catch {}

      if (anonDiag) {
        try {
          const res = await fetch("/api/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ diagnostic: anonDiag }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Erreur");
          if (!cancelled) {
            setAction(json.action as Action);
            try {
              sessionStorage.setItem(
                ACTION_STORAGE_KEY,
                JSON.stringify(json.action)
              );
            } catch {}
            setLoading(false);
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : "Erreur inattendue");
            setLoading(false);
          }
        }
        return;
      }

      // 3. Fallback : mode connecté
      const supabase = createClient();
      let did = diagnosticId;

      if (!did) {
        const { data } = await supabase
          .from("diagnostics")
          .select("id")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        did = data?.id ?? null;
      }

      if (!did) {
        setError("Pas de diagnostic disponible. Fais d'abord un diagnostic.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ diagnosticId: did }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Erreur");
        if (!cancelled) {
          setAction(json.action as Action);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erreur inattendue");
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [diagnosticId]);

  const persistClients = async (clients: ClientTouch[]) => {
    if (!action) return;
    const next = { ...action, clients };
    setAction(next);
    try {
      sessionStorage.setItem(ACTION_STORAGE_KEY, JSON.stringify(next));
    } catch {}
    if (
      clients.length > 0 &&
      clients.every((c) => c.status === "sent" || c.status === "answered")
    ) {
      setAllSent(true);
    }
    if (!action.id.startsWith("anon-")) {
      await fetch("/api/action", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: action.id, clients }),
      });
    }
  };

  const markCompleted = async () => {
    if (!action) return;
    setCompleted(true);
    if (!action.id.startsWith("anon-")) {
      await fetch("/api/action", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: action.id, status: "completed" }),
      });
    }
  };

  const clients = action?.clients ?? [];

  useEffect(() => {
    if (
      clients.length > 0 &&
      clients.every((c) => c.status === "sent" || c.status === "answered")
    ) {
      setAllSent(true);
    }
  }, [clients]);

  const filledVerbatimKeys = Object.keys(verbatims).filter((k) => {
    if (notYet[k]) return false;
    return (verbatims[k] ?? "").trim().length > 0;
  });
  const canAnalyze = filledVerbatimKeys.length >= 2 && !analyzing;

  const submitVerbatims = async () => {
    if (!canAnalyze || !action) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    const payload = {
      actionId: action.id,
      diagnosticId: action.diagnostic_id,
      verbatims: clients
        .map((c, i) => {
          const key = String(i);
          if (notYet[key]) return null;
          const text = (verbatims[key] ?? "").trim();
          if (!text) return null;
          return {
            contact_name: c.name,
            channel: c.channel,
            text,
          };
        })
        .filter(Boolean),
    };
    try {
      const res = await fetch("/api/analyze-verbatims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.analysis) {
        throw new Error(
          json?.error ?? json?.debug ?? `HTTP ${res.status}`
        );
      }
      setAnalysisResult(json.analysis as VerbatimAnalysis);
      // Persiste les verbatims sur les clients (statut answered + texte).
      const patchedClients = clients.map((c, i) => {
        const key = String(i);
        if (notYet[key]) return c;
        const text = (verbatims[key] ?? "").trim();
        if (!text) return c;
        return { ...c, status: "answered" as const, response_text: text };
      });
      void persistClients(patchedClients);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setAnalyzing(false);
    }
  };

  const tagsByContact = new Map<string, string[]>(
    (analysisResult?.tags_per_contact ?? []).map((t) => [
      t.name.trim().toLowerCase(),
      t.tags ?? [],
    ])
  );

  // Stepper : Diagnostic ✓, Action actif → Suivi actif après analyse →
  // Réajustement actif après « On continue ».
  const stepperActive: StepperStep = continued
    ? "Réajustement"
    : analysisResult
      ? "Suivi"
      : "Action";
  const stepperDone: StepperStep[] = continued
    ? ["Diagnostic", "Action", "Suivi"]
    : analysisResult
      ? ["Diagnostic", "Action"]
      : ["Diagnostic"];

  const handleDoubts = () => {
    router.push("/chat");
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
        <div className="mb-6">
          <ProgressStepper active={stepperActive} done={stepperDone} />
        </div>

        {loading && (
          <div className="flex flex-col items-center py-16">
            <OniAvatar size={100} speaking />
            <p className="mt-4 text-gray-600">
              Oni prépare ta première action…
            </p>
          </div>
        )}

        {error && (
          <div className="bg-status-critical-bg border border-status-critical/30 rounded-card p-4 text-status-critical">
            {error}
            <div className="mt-3">
              <Link
                href="/chat"
                className="inline-block px-4 py-2 rounded-card bg-accent text-white font-semibold text-sm"
              >
                Aller au chat
              </Link>
            </div>
          </div>
        )}

        {action && (
          <div className="space-y-6">
            <OniMessage
              content={`On attaque avec le pilier "${action.pillar}". Objectif : ${action.title}. ${
                action.description ?? ""
              }`}
            />

            <ActionCard
              action={action}
              reasoning={action.diagnostic_reasoning}
              onClientsChange={persistClients}
              onComplete={markCompleted}
            />

            {action.deliverable && (
              <DeliverableCard content={action.deliverable} />
            )}

            {allSent && !completed && !analysisResult && !showVerbatimForm && !remindLater && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 mt-2">
                <div className="flex items-start gap-3 mb-6">
                  <OniAvatar size={32} />
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-gray-800">
                      Parfait, tout est parti. Dès que t&apos;as des réponses,
                      colle-les ici — j&apos;ai besoin de leurs mots exacts
                      pour bosser.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setShowVerbatimForm(true)}
                    className="w-full bg-accent text-white py-3 px-6 rounded-lg font-medium hover:bg-accent-dark transition"
                  >
                    J&apos;ai déjà reçu des réponses →
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemindLater(true)}
                    className="w-full bg-white border border-gray-200 text-gray-600 py-3 px-6 rounded-lg font-medium hover:bg-gray-50 transition"
                  >
                    Pas encore — rappelle-moi plus tard
                  </button>
                </div>
              </div>
            )}

            {allSent && !completed && !analysisResult && !showVerbatimForm && remindLater && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 mt-2">
                <div className="flex items-start gap-3 mb-6">
                  <OniAvatar size={32} />
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-gray-800">
                      Ok, je te laisse respirer. Reviens dès que tu as des
                      retours — même partiels, ça me suffit pour avancer.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRemindLater(false);
                    setShowVerbatimForm(true);
                  }}
                  className="w-full bg-accent text-white py-3 px-6 rounded-lg font-medium hover:bg-accent-dark transition"
                >
                  En fait j&apos;ai des réponses →
                </button>
              </div>
            )}

            {allSent && !completed && !analysisResult && showVerbatimForm && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 mt-2 space-y-4">
                <p className="text-sm text-gray-600">
                  Colle la réponse de chaque personne mot pour mot. Coche
                  « Pas encore de réponse » pour celles qui n&apos;ont pas
                  répondu.
                </p>
                {clients.map((c, i) => {
                  const key = String(i);
                  const pending = !!notYet[key];
                  return (
                    <div key={key} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {c.name}{" "}
                          <span className="text-gray-400 font-normal normal-case">
                            — {c.channel}
                          </span>
                        </label>
                        <label className="text-xs text-gray-500 flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={pending}
                            onChange={() => {
                              setNotYet((prev) => {
                                const next = { ...prev, [key]: !prev[key] };
                                if (next[key]) {
                                  setVerbatims((v) => ({ ...v, [key]: "" }));
                                }
                                return next;
                              });
                            }}
                            className="accent-accent"
                          />
                          Pas encore de réponse
                        </label>
                      </div>
                      <textarea
                        value={verbatims[key] ?? ""}
                        onChange={(e) =>
                          setVerbatims((v) => ({
                            ...v,
                            [key]: e.target.value,
                          }))
                        }
                        placeholder={
                          pending ? "" : `Colle ici la réponse de ${c.name}…`
                        }
                        disabled={pending}
                        className={`w-full min-h-24 p-3 rounded-lg border text-sm resize-y focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent ${
                          pending
                            ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
                            : "border-gray-200 text-gray-800"
                        }`}
                      />
                    </div>
                  );
                })}
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={submitVerbatims}
                    disabled={!canAnalyze}
                    className="bg-accent text-white py-2.5 px-5 rounded-lg font-medium hover:bg-accent-dark transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {analyzing
                      ? "Analyse en cours…"
                      : "Analyser les réponses →"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowVerbatimForm(false)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Retour
                  </button>
                </div>
                {filledVerbatimKeys.length < 2 && (
                  <p className="text-xs text-gray-500">
                    Il faut au moins 2 réponses saisies pour lancer
                    l&apos;analyse.
                  </p>
                )}
                {analyzeError && (
                  <p className="text-xs text-status-critical">
                    {analyzeError}
                  </p>
                )}
              </div>
            )}

            {analyzing && !analysisResult && (
              <div className="bg-white border border-gray-200 rounded-xl p-8 mt-2 flex flex-col items-center text-center">
                <OniAvatar size={72} speaking />
                <p className="mt-4 text-gray-700 font-medium">
                  Oni analyse les réponses…
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Recherche de patterns et convergence dans les verbatims.
                </p>
              </div>
            )}

            {analysisResult && (
              <div className="space-y-6">
                {/* A) Message Oni */}
                <OniMessage content={analysisResult.analysis_oni} />

                {/* B) Verbatims collectés */}
                <div className="bg-surface-1 border border-gray-200 rounded-card overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 font-semibold">
                    Verbatims collectés
                  </div>
                  <div className="divide-y divide-gray-100">
                    {clients.map((c, i) => {
                      const key = String(i);
                      const text = (verbatims[key] ?? c.response_text ?? "").trim();
                      if (notYet[key] || !text) return null;
                      const tags =
                        tagsByContact.get(c.name.trim().toLowerCase()) ?? [];
                      return (
                        <div key={key} className="p-5 flex gap-3">
                          <div className="h-10 w-10 rounded-full bg-accent-light text-accent-dark flex items-center justify-center font-semibold text-sm shrink-0">
                            {c.name
                              .split(" ")
                              .map((s) => s[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap text-sm">
                              <span className="font-semibold text-gray-900">
                                {c.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                · {c.channel}
                              </span>
                            </div>
                            <blockquote className="mt-2 border-l-2 border-accent pl-3 text-sm text-gray-700 italic whitespace-pre-wrap">
                              {text}
                            </blockquote>
                            {tags.length > 0 && (
                              <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                                {tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-xs text-accent-dark bg-accent-light rounded-pill px-2 py-0.5"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* C) Pattern détecté */}
                {analysisResult.convergence && (
                  <div className="bg-accent-light/25 border border-accent/20 rounded-card p-5">
                    <div className="flex items-start gap-3">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-accent-dark mt-0.5 shrink-0"
                      >
                        <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2v.3h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2Z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs uppercase tracking-wide text-accent-dark font-semibold">
                          Pattern détecté par Oni
                        </div>
                        {analysisResult.patterns.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {analysisResult.patterns.map((p) => (
                              <span
                                key={p}
                                className="text-xs text-accent-dark bg-white border border-accent/20 rounded-pill px-2 py-0.5"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                        {analysisResult.angle && (
                          <p className="mt-3 text-sm font-semibold text-gray-900 leading-relaxed">
                            {analysisResult.angle}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* D) Prochaine action débloquée */}
                <div className="bg-surface-1 border border-accent shadow-card rounded-card p-5">
                  <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">
                    Prochaine action débloquée
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {analysisResult.next_action.title}
                  </h3>
                  <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                    {analysisResult.next_action.description}
                  </p>
                  {analysisResult.next_action.kpi && (
                    <div className="mt-4 bg-surface-2 rounded-card p-3">
                      <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                        KPI
                      </div>
                      <div className="text-sm text-gray-900 mt-0.5">
                        {analysisResult.next_action.kpi}
                      </div>
                    </div>
                  )}
                  {!continued ? (
                    <div className="mt-5 flex items-center gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={handleDoubts}
                        className="text-sm font-medium px-4 py-2 rounded-card border border-gray-200 text-gray-700 hover:bg-surface-2 transition-colors"
                      >
                        J&apos;ai des doutes
                      </button>
                      <button
                        type="button"
                        onClick={() => setContinued(true)}
                        className="text-sm font-semibold px-4 py-2 rounded-card bg-accent text-white hover:bg-accent-dark transition-colors"
                      >
                        On continue →
                      </button>
                    </div>
                  ) : (
                    <div className="mt-5 flex items-center gap-3 text-sm text-status-solid">
                      <div className="h-6 w-6 rounded-full bg-status-solid text-white flex items-center justify-center text-xs">
                        ✓
                      </div>
                      Prochaine action lancée. Envoie-toi au boulot — je reste
                      en veille.
                    </div>
                  )}
                </div>
              </div>
            )}

            {completed && !analysisResult && (
              <div className="bg-status-solid-bg border border-status-solid/30 rounded-card p-4 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-status-solid text-white flex items-center justify-center">
                  ✓
                </div>
                <div>
                  <div className="font-semibold text-gray-900">
                    Étape terminée
                  </div>
                  <div className="text-sm text-gray-600">
                    Reviens dans quelques jours pour le suivi et l&apos;étape
                    suivante.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <OniFab />
    </div>
  );
}

export default function ActionPage() {
  return (
    <Suspense>
      <ActionInner />
    </Suspense>
  );
}
