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
            clientName: c.name,
            channel: c.channel,
            response: text,
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
      if (!res.ok) {
        const raw = await res.text();
        throw new Error(
          raw.length > 200
            ? `HTTP ${res.status} — endpoint indisponible`
            : raw || `HTTP ${res.status}`
        );
      }
      router.push("/diagnostic");
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Erreur réseau");
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
        <div className="mb-6">
          <ProgressStepper active="Action" done={["Diagnostic"]} />
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

            {allSent && !completed && !showVerbatimForm && !remindLater && (
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

            {allSent && !completed && !showVerbatimForm && remindLater && (
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

            {allSent && !completed && showVerbatimForm && (
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

            {completed && (
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
