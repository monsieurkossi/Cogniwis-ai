"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OniAvatar } from "@/components/OniAvatar";
import { OniMessage } from "@/components/OniMessage";
import { ProgressStepper } from "@/components/ProgressStepper";
import { PillarList } from "@/components/PillarList";
import { OniFab } from "@/components/OniFab";
import { createClient } from "@/lib/supabase/client";
import type { Diagnostic } from "@/lib/types";

const LOADING_STEPS = [
  "Je relis nos échanges…",
  "J'évalue tes 7 piliers…",
  "J'applique les règles de décision…",
  "Je calcule ta priorité…",
];

function DiagnosticInner() {
  const params = useSearchParams();
  const router = useRouter();
  const conversationId = params.get("conversation");
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(
      () => setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)),
      1400
    );
    return () => clearInterval(t);
  }, [loading]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      let cid = conversationId;

      if (!cid) {
        const { data } = await supabase
          .from("conversations")
          .select("id")
          .eq("status", "diagnostic_ready")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        cid = data?.id ?? null;
      }

      if (!cid) {
        setError("Aucune conversation prête pour un diagnostic. Passe par le chat d'abord.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/diagnostic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: cid }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Erreur diagnostic");
        if (!cancelled) {
          setDiagnostic(json.diagnostic as Diagnostic);
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
  }, [conversationId]);

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
        <div className="mb-6">
          <ProgressStepper active="Diagnostic" />
        </div>

        {loading && (
          <div className="flex flex-col items-center py-16 text-center">
            <OniAvatar size={120} speaking />
            <h2 className="mt-6 text-xl font-semibold text-gray-900">
              Oni analyse ta situation
            </h2>
            <div className="mt-4 space-y-1.5 text-sm text-gray-600 min-h-[6rem]">
              {LOADING_STEPS.map((s, i) => (
                <div
                  key={s}
                  className={`transition-opacity ${
                    i <= loadingStep ? "opacity-100" : "opacity-30"
                  }`}
                >
                  {i < loadingStep && (
                    <span className="text-status-solid mr-1.5">✓</span>
                  )}
                  {i === loadingStep && (
                    <span className="typing-dots align-middle mr-1.5">
                      <span />
                      <span />
                      <span />
                    </span>
                  )}
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-status-critical-bg border border-status-critical/30 rounded-card p-4 text-status-critical">
            {error}
          </div>
        )}

        {diagnostic && (
          <div className="space-y-6">
            <OniMessage
              content={diagnostic.verdict}
            />

            {diagnostic.reframing && (
              <div className="bg-surface-1 border border-gray-200 border-l-4 border-l-accent rounded-card p-4 shadow-card">
                <div className="text-xs uppercase tracking-wide text-accent-dark font-semibold mb-1">
                  Recadrage
                </div>
                <p className="text-gray-800 leading-relaxed">
                  {diagnostic.reframing}
                </p>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="bg-surface-2 rounded-card p-3">
                    <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                      Ce que tu as dit vouloir
                    </div>
                    <div className="text-gray-800 mt-1">
                      {(diagnostic as unknown as { declared_objective?: string })
                        .declared_objective ?? "—"}
                    </div>
                  </div>
                  <div className="bg-accent-light rounded-card p-3">
                    <div className="text-xs text-accent-dark font-semibold uppercase tracking-wide">
                      Ce que tu veux vraiment
                    </div>
                    <div className="text-gray-900 mt-1">
                      {(diagnostic as unknown as { real_objective?: string })
                        .real_objective ?? "—"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-surface-1 border border-gray-200 rounded-card p-5 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                    Score global
                  </div>
                  <div className="text-4xl font-bold text-gray-900 mt-1">
                    {diagnostic.global_score}
                    <span className="text-lg text-gray-400 font-medium">/100</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                    Priorité
                  </div>
                  <div className="mt-1 inline-block px-3 py-1 rounded-pill bg-accent text-white font-semibold text-sm">
                    {diagnostic.priority_pillar}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed border-t border-gray-100 pt-3">
                {diagnostic.reasoning}
              </p>
              {diagnostic.active_rules?.length > 0 && (
                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-gray-500">Règles activées :</span>
                  {diagnostic.active_rules.map((r) => (
                    <span
                      key={r}
                      className="text-xs font-mono px-2 py-0.5 rounded-pill bg-surface-2 text-gray-600 border border-gray-200"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">
                Tes 7 piliers
              </div>
              <PillarList diagnostic={diagnostic} />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  router.push(`/action?diagnostic=${diagnostic.id}`)
                }
                className="px-5 py-3 rounded-card bg-accent text-white font-semibold hover:bg-accent-dark transition-colors"
              >
                C&apos;est parti, on commence →
              </button>
            </div>
          </div>
        )}
      </div>
      <OniFab />
    </div>
  );
}

export default function DiagnosticPage() {
  return (
    <Suspense>
      <DiagnosticInner />
    </Suspense>
  );
}
