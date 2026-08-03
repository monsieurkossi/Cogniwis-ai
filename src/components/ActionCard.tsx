"use client";

import { useState } from "react";
import type { Action, ClientTouch } from "@/lib/types";
import { ClientCard, type AdjustmentType } from "./ClientCard";

const PIPELINE_STEPS = ["À faire", "En cours", "Envoyé", "Résultat reçu"];

interface Props {
  action: Action;
  reasoning?: string | null;
  onClientsChange?: (clients: ClientTouch[]) => void;
  onComplete?: () => void;
}

export function ActionCard({ action, reasoning, onClientsChange }: Props) {
  const [clients, setClients] = useState<ClientTouch[]>(action.clients ?? []);
  const activeIdx = clients.findIndex(
    (c) => c.status !== "sent" && c.status !== "answered"
  );

  const updateClient = (idx: number, patch: Partial<ClientTouch>) => {
    const next = clients.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    setClients(next);
    onClientsChange?.(next);
  };

  const adjustMessage = async (
    idx: number,
    type: AdjustmentType,
    customInstruction?: string
  ) => {
    const target = clients[idx];
    if (!target) return;
    const res = await fetch("/api/action/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        original_content: target.message,
        adjustment_type: type,
        custom_instruction: customInstruction ?? null,
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.content) {
      throw new Error(json?.error ?? `HTTP ${res.status}`);
    }
    updateClient(idx, { message: json.content });
  };

  const sentCount = clients.filter(
    (c) => c.status === "sent" || c.status === "answered"
  ).length;

  const pipelineIdx =
    sentCount === 0 ? 0 : sentCount < clients.length ? 1 : 2;

  const whyText = (reasoning ?? action.diagnostic_reasoning ?? "").trim();

  return (
    <div className="space-y-4">
      {whyText && (
        <div className="bg-accent-light/25 border border-accent/20 rounded-card p-5">
          <div className="text-xs uppercase tracking-wide text-accent-dark font-semibold mb-2">
            Pourquoi cette action
          </div>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {whyText}
          </p>
        </div>
      )}

      <div className="bg-surface-1 rounded-card border border-accent shadow-card overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">
            Ce que tu dois faire
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded-pill bg-accent text-white font-semibold">
                  Étape {action.step_number}/{action.total_steps}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-pill bg-surface-1 border border-accent/20 text-accent-dark font-semibold">
                  {action.pillar}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {action.title}
              </h2>
              {action.description && (
                <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                  {action.description}
                </p>
              )}
            </div>
            <div className="text-right">
              {action.estimated_time && (
                <div className="text-xs text-gray-500">
                  Temps estimé
                  <div className="text-sm font-semibold text-gray-900">
                    {action.estimated_time}
                  </div>
                </div>
              )}
            </div>
          </div>

          {action.kpi_target && (
            <div className="mt-4 bg-surface-2 rounded-card p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                KPI cible
              </div>
              <div className="text-sm text-gray-900 mt-0.5">
                {action.kpi_target}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            {PIPELINE_STEPS.map((s, idx) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    idx <= pipelineIdx ? "bg-accent" : "bg-gray-300"
                  }`}
                />
                <span
                  className={`text-xs ${
                    idx <= pipelineIdx
                      ? "text-accent-dark font-medium"
                      : "text-gray-400"
                  }`}
                >
                  {s}
                </span>
                {idx < PIPELINE_STEPS.length - 1 && (
                  <div className="h-px w-4 bg-gray-200" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
              Clients à contacter ({sentCount}/{clients.length})
            </div>
          </div>
          {clients.map((c, idx) => {
            const isActive =
              idx === activeIdx ||
              (activeIdx === -1 && idx === clients.length - 1);
            return (
              <ClientCard
                key={idx}
                client={c}
                index={idx}
                active={isActive}
                onCopy={() => {}}
                onMarkSent={() => updateClient(idx, { status: "sent" })}
                onAdjust={(type, custom) => adjustMessage(idx, type, custom)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
