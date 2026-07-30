"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { OniAvatar } from "@/components/OniAvatar";
import { OniMessage } from "@/components/OniMessage";
import { ProgressStepper } from "@/components/ProgressStepper";
import { ActionCard } from "@/components/ActionCard";
import { DeliverableCard } from "@/components/DeliverableCard";
import { OniFab } from "@/components/OniFab";
import { createClient } from "@/lib/supabase/client";
import type { Action, ClientTouch } from "@/lib/types";

function ActionInner() {
  const params = useSearchParams();
  const diagnosticId = params.get("diagnostic");
  const [action, setAction] = useState<Action | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
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
    setAction({ ...action, clients });
    await fetch("/api/action", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId: action.id, clients }),
    });
  };

  const markCompleted = async () => {
    if (!action) return;
    setCompleted(true);
    await fetch("/api/action", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId: action.id, status: "completed" }),
    });
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
              onClientsChange={persistClients}
              onComplete={markCompleted}
            />

            {action.deliverable && (
              <DeliverableCard content={action.deliverable} />
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
