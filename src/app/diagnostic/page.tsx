"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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

type ErrorState =
  | { kind: "no-conversation" }
  | { kind: "retry"; message?: string; debug?: string; status?: number };

function DiagnosticInner() {
  const params = useSearchParams();
  const router = useRouter();
  const conversationId = params.get("conversation");
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);

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
          const rawText = await res.text();
          let json: {
            diagnostic?: Diagnostic;
            error?: string;
            debug?: string;
          } = {};
          try {
            json = JSON.parse(rawText);
          } catch {
            // Vercel a probablement renvoyé une page HTML d'erreur (timeout,
            // crash runtime). On expose le texte brut pour debug.
            console.error(
              "[diagnostic] réponse non-JSON, status:",
              res.status,
              "body:",
              rawText.substring(0, 500)
            );
            setError({
              kind: "retry",
              message: `non-JSON response (${res.status})`,
              debug: rawText.substring(0, 1500),
              status: res.status,
            });
            setLoading(false);
            return;
          }
          if (!res.ok) {
            console.error("[diagnostic] réponse !ok", res.status, json);
            setError({
              kind: "retry",
              message: json.error,
              debug: json.debug ?? rawText.substring(0, 1500),
              status: res.status,
            });
            setLoading(false);
            return;
          }
          setDiagnostic(json.diagnostic as Diagnostic);
          try {
            sessionStorage.setItem(
              DIAG_STORAGE_KEY,
              JSON.stringify(json.diagnostic)
            );
          } catch {}
          setLoading(false);
        } catch (err) {
          console.error("[diagnostic] fetch failed", err);
          setError({
            kind: "retry",
            message: err instanceof Error ? err.message : "network",
          });
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
        setError({ kind: "no-conversation" });
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/diagnostic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: cid }),
        });
        const rawText = await res.text();
        let json: {
          diagnostic?: Diagnostic;
          error?: string;
          debug?: string;
        } = {};
        try {
          json = JSON.parse(rawText);
        } catch {
          console.error(
            "[diagnostic] réponse non-JSON, status:",
            res.status,
            "body:",
            rawText.substring(0, 500)
          );
          setError({
            kind: "retry",
            message: `non-JSON response (${res.status})`,
            debug: rawText.substring(0, 1500),
            status: res.status,
          });
          setLoading(false);
          return;
        }
        if (!res.ok) {
          console.error("[diagnostic] réponse !ok", res.status, json);
          setError({
            kind: "retry",
            message: json.error,
            debug: json.debug ?? rawText.substring(0, 1500),
            status: res.status,
          });
          setLoading(false);
          return;
        }
        setDiagnostic(json.diagnostic as Diagnostic);
        setLoading(false);
      } catch (err) {
        console.error("[diagnostic] fetch failed", err);
        setError({
          kind: "retry",
          message: err instanceof Error ? err.message : "network",
        });
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

        {error?.kind === "no-conversation" && (
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

        {error?.kind === "retry" && (
          <div className="bg-amber-50 border border-amber-200 rounded-card p-6 shadow-card">
            <div className="text-center">
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
            {(error.debug || error.message || error.status) && (
              <details className="mt-6">
                <summary className="text-xs text-gray-500 cursor-pointer select-none">
                  Debug info (temporaire)
                </summary>
                <div className="mt-2 space-y-2">
                  {error.status && (
                    <div className="text-xs text-gray-500">
                      status HTTP : <span className="font-mono">{error.status}</span>
                    </div>
                  )}
                  {error.message && (
                    <div className="text-xs text-gray-500">
                      error : <span className="font-mono">{error.message}</span>
                    </div>
                  )}
                  {error.debug && (
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all bg-gray-100 p-3 rounded max-h-96 overflow-auto">
                      {error.debug}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        )}

        {diagnostic && (
          <div className="space-y-6 pb-28">
            {/* HERO SCORE + VERDICT */}
            <div className="relative rounded-3xl bg-gradient-to-br from-gray-900 via-gray-900 to-accent-dark text-white p-6 sm:p-8 overflow-hidden shadow-card">
              <div
                aria-hidden
                className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-accent/40 blur-3xl"
              />
              <div
                aria-hidden
                className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-accent-dark/60 blur-3xl"
              />
              <div className="relative grid lg:grid-cols-[220px_1fr] gap-8 items-center">
                <ScoreRadial score={diagnostic.global_score} />
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/60 font-semibold">
                    Diagnostic Cogniwis
                  </div>
                  <h1 className="mt-2 text-2xl sm:text-3xl font-semibold leading-tight tracking-tight">
                    {diagnostic.verdict}
                  </h1>
                  <div className="mt-5 flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] uppercase tracking-wide text-white/60">
                      Pilier prioritaire
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-white text-gray-900 font-semibold text-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                      {diagnostic.priority_pillar}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* RECADRAGE */}
            {diagnostic.reframing && (
              <div className="rounded-2xl bg-surface-1 border border-gray-200 p-6 shadow-card">
                <div className="text-[11px] uppercase tracking-[0.16em] text-accent-dark font-semibold flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-accent" />
                  Recadrage
                </div>
                <p className="mt-3 text-gray-800 leading-relaxed">
                  {diagnostic.reframing}
                </p>
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
                  <div className="rounded-xl bg-surface-2 p-4">
                    <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">
                      Ce que tu as dit vouloir
                    </div>
                    <div className="text-gray-800 mt-1.5 leading-snug">
                      {diagnostic.declared_objective ?? "—"}
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center justify-center text-gray-400">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </div>
                  <div className="rounded-xl bg-accent-light border border-accent/20 p-4">
                    <div className="text-[11px] text-accent-dark font-semibold uppercase tracking-wide">
                      Ce que tu veux vraiment
                    </div>
                    <div className="text-gray-900 mt-1.5 leading-snug font-medium">
                      {diagnostic.real_objective ?? "—"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* RAISONNEMENT ONI */}
            <div className="rounded-2xl bg-surface-1 border border-gray-200 p-6 shadow-card">
              <div className="text-[11px] uppercase tracking-[0.16em] text-gray-500 font-semibold flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-gray-400" />
                Ce qu&apos;Oni retient
              </div>
              <p className="mt-3 text-gray-700 leading-relaxed">
                {diagnostic.reasoning}
              </p>
              {diagnostic.active_rules?.length > 0 && (
                <div className="mt-4 flex items-center gap-1.5 flex-wrap">
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

            {/* PILIERS EN BENTO */}
            <div>
              <div className="flex items-baseline justify-between mb-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-gray-500 font-semibold flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-gray-400" />
                    Tes 7 piliers
                  </div>
                  <h2 className="mt-1 text-xl font-semibold text-gray-900 tracking-tight">
                    Vue d&apos;ensemble
                  </h2>
                </div>
                <ScoreLegend />
              </div>
              <PillarList diagnostic={diagnostic} />
            </div>

            {/* CTA STICKY */}
            <div className="fixed bottom-0 inset-x-0 z-30 pointer-events-none">
              <div className="max-w-4xl mx-auto px-4 pb-4">
                <div className="pointer-events-auto rounded-2xl bg-gray-900 text-white p-4 shadow-2xl flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-white/60 font-semibold">
                      Prochaine étape
                    </div>
                    <div className="text-sm font-semibold">
                      Attaquer{" "}
                      <span className="text-accent-light">
                        {diagnostic.priority_pillar}
                      </span>{" "}
                      avec une action guidée
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={goToAction}
                    className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-white text-gray-900 font-semibold text-sm hover:bg-white/95 transition-transform hover:scale-[1.02]"
                  >
                    On commence
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <OniFab
        pageContext={
          diagnostic
            ? `L'utilisateur regarde son diagnostic. Score global ${diagnostic.global_score}/100, pilier prioritaire "${diagnostic.priority_pillar}". Verdict : ${diagnostic.verdict}`
            : "L'utilisateur est sur la page diagnostic (chargement ou erreur)."
        }
      />
    </div>
  );
}

function ScoreRadial({ score }: { score: number }) {
  const radius = 76;
  const stroke = 14;
  const c = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (clamped / 100) * c;
  const scoreColor =
    clamped <= 29
      ? "#ef4444"
      : clamped <= 55
        ? "#f59e0b"
        : "#10b981";
  return (
    <div className="relative h-[200px] w-[200px] mx-auto lg:mx-0">
      <svg
        viewBox="0 0 200 200"
        width="200"
        height="200"
        className="-rotate-90"
      >
        <circle
          cx="100"
          cy="100"
          r={radius}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx="100"
          cy="100"
          r={radius}
          stroke={scoreColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          fill="none"
          style={{ transition: "stroke-dasharray 800ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-[10px] uppercase tracking-[0.16em] text-white/60 font-semibold">
          Score global
        </div>
        <div className="mt-1 text-5xl font-semibold leading-none">
          {clamped}
        </div>
        <div className="mt-1 text-xs text-white/50">/100</div>
      </div>
    </div>
  );
}

function ScoreLegend() {
  const items: { label: string; color: string }[] = [
    { label: "Critique", color: "bg-status-critical" },
    { label: "Fragile", color: "bg-status-fragile" },
    { label: "Solide", color: "bg-status-solid" },
  ];
  return (
    <div className="hidden sm:flex items-center gap-3 text-[11px] text-gray-500">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${i.color}`} />
          {i.label}
        </span>
      ))}
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
