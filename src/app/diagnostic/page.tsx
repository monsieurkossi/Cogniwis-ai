"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { OniMessage } from "@/components/OniMessage";
import { ProgressStepper } from "@/components/ProgressStepper";
import { PillarList } from "@/components/PillarList";
import { OniFab } from "@/components/OniFab";
import { DiagnosticLoader } from "@/components/DiagnosticLoader";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage, Diagnostic } from "@/lib/types";

const STORAGE_KEY = "cogniwis:pending-conversation";
const DIAG_STORAGE_KEY = "cogniwis:diagnostic";

interface PendingConversation {
  messages: ChatMessage[];
  recap: string | null;
}

function DiagnosticInner() {
  const params = useSearchParams();
  const router = useRouter();
  const conversationId = params.get("conversation");
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { force?: boolean }) => {
      const force = !!opts?.force;
      setError(null);
      setLoading(true);

      // 1. Diagnostic déjà en cache (session courante) → on l'affiche direct,
      //    sauf si on force un retry.
      if (!force) {
        try {
          const cached = sessionStorage.getItem(DIAG_STORAGE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached) as Diagnostic;
            setDiagnostic(parsed);
            setLoading(false);
            return;
          }
        } catch {}
      } else {
        try {
          sessionStorage.removeItem(DIAG_STORAGE_KEY);
        } catch {}
      }

      // 2. Conversation en attente en sessionStorage → mode anonyme, payload direct.
      let pending: PendingConversation | null = null;
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) pending = JSON.parse(raw) as PendingConversation;
      } catch {}

      if (pending && pending.messages && pending.messages.length > 0) {
        try {
          const res = await fetch("/api/diagnostic", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: pending.messages,
              recap: pending.recap,
            }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Erreur diagnostic");
          setDiagnostic(json.diagnostic as Diagnostic);
          try {
            sessionStorage.setItem(
              DIAG_STORAGE_KEY,
              JSON.stringify(json.diagnostic)
            );
          } catch {}
          setLoading(false);
        } catch {
          // On garde le message technique dans la console via le server log,
          // et on affiche un message humain à l'utilisateur.
          setError("retry");
          setLoading(false);
        }
        return;
      }

      // 3. Fallback : mode connecté avec conversation en base.
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
        setError("no-conversation");
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
        setDiagnostic(json.diagnostic as Diagnostic);
        setLoading(false);
      } catch {
        setError("retry");
        setLoading(false);
      }
    },
    [conversationId]
  );

  useEffect(() => {
    load();
  }, [load]);

  const goToAction = () => {
    if (!diagnostic) return;
    if (diagnostic.id?.startsWith?.("anon-")) {
      // On garde le diag déjà en session pour /action.
      try {
        sessionStorage.setItem(DIAG_STORAGE_KEY, JSON.stringify(diagnostic));
      } catch {}
      router.push("/action");
    } else {
      router.push(`/action?diagnostic=${diagnostic.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      {loading && <DiagnosticLoader done={!!diagnostic} />}
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
        <div className="mb-6">
          <ProgressStepper active="Diagnostic" />
        </div>

        {error === "no-conversation" && (
          <div className="bg-surface-1 border border-gray-200 rounded-card p-6 text-center shadow-card">
            <p className="text-gray-900 font-semibold mb-1">
              Oni a besoin d&apos;échanger avec toi d&apos;abord
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Fais une petite conversation avec lui et il pourra te préparer ton
              diagnostic.
            </p>
            <Link
              href="/chat"
              className="inline-block px-5 py-2.5 rounded-card bg-accent text-white font-semibold text-sm hover:bg-accent-dark transition-colors"
            >
              Aller au chat →
            </Link>
          </div>
        )}

        {error === "retry" && (
          <div className="bg-amber-50 border border-amber-200 rounded-card p-6 text-center shadow-card">
            <p className="text-amber-900 font-semibold mb-1">
              Oni a eu un souci en analysant ton profil
            </p>
            <p className="text-sm text-amber-700 mb-4">
              Ça arrive parfois. On relance l&apos;analyse.
            </p>
            <button
              type="button"
              onClick={() => load({ force: true })}
              className="inline-block px-5 py-2.5 rounded-card bg-accent text-white font-semibold text-sm hover:bg-accent-dark transition-colors"
            >
              Relancer le diagnostic
            </button>
          </div>
        )}

        {diagnostic && (
          <div className="space-y-6">
            <OniMessage content={diagnostic.verdict} />

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
                      {diagnostic.declared_objective ?? "—"}
                    </div>
                  </div>
                  <div className="bg-accent-light rounded-card p-3">
                    <div className="text-xs text-accent-dark font-semibold uppercase tracking-wide">
                      Ce que tu veux vraiment
                    </div>
                    <div className="text-gray-900 mt-1">
                      {diagnostic.real_objective ?? "—"}
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
                onClick={goToAction}
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
