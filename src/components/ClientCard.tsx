"use client";

import { useState } from "react";
import type { ClientTouch } from "@/lib/types";

export type AdjustmentType = "tone" | "shorter" | "custom";

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  email: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  linkedin: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2ZM8 19H5v-9h3ZM6.5 8.25A1.75 1.75 0 1 1 8.3 6.5a1.78 1.78 0 0 1-1.8 1.75ZM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0 0 13 14.19a.66.66 0 0 0 0 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 0 1 2.7-1.4c1.55 0 3.36.86 3.36 3.66Z" />
    </svg>
  ),
  whatsapp: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
    </svg>
  ),
  sms: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
};

interface Props {
  client: ClientTouch;
  index: number;
  active: boolean;
  onCopy?: (message: string) => void;
  onMarkSent?: () => void;
  onEdit?: () => void;
  onAdjust?: (type: AdjustmentType, customInstruction?: string) => Promise<void> | void;
}

const MAX_ADJUSTMENTS = 3;

export function ClientCard({
  client,
  index,
  active,
  onCopy,
  onMarkSent,
  onEdit,
  onAdjust,
}: Props) {
  const channel = client.channel.toLowerCase();
  const icon = CHANNEL_ICONS[channel] ?? CHANNEL_ICONS.email;
  const sent = client.status === "sent" || client.status === "answered";
  const [adjustCount, setAdjustCount] = useState(0);
  const [adjusting, setAdjusting] = useState<AdjustmentType | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const runAdjustment = async (type: AdjustmentType, custom?: string) => {
    if (!onAdjust || adjustCount >= MAX_ADJUSTMENTS) return;
    setAdjustError(null);
    setAdjusting(type);
    try {
      await onAdjust(type, custom);
      setAdjustCount((n) => n + 1);
      setShowCustom(false);
      setCustomInput("");
    } catch (err) {
      setAdjustError(err instanceof Error ? err.message : "Ajustement raté");
    } finally {
      setAdjusting(null);
    }
  };

  const canAdjust = !!onAdjust && !sent && adjustCount < MAX_ADJUSTMENTS;

  return (
    <div
      className={`bg-surface-1 rounded-card border shadow-card overflow-hidden transition-all ${
        active
          ? "border-accent ring-1 ring-accent/20"
          : "border-gray-200 opacity-60"
      }`}
    >
      <div className="flex items-start gap-3 p-4 border-b border-gray-100">
        <div className="h-10 w-10 rounded-full bg-accent-light text-accent-dark flex items-center justify-center font-semibold text-sm shrink-0">
          {client.name
            .split(" ")
            .map((s) => s[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-semibold text-gray-900 truncate">
              {client.name}
            </div>
            <span className="text-xs text-gray-400">#{index + 1}</span>
          </div>
          {client.role && (
            <div className="text-xs text-gray-500 mt-0.5">{client.role}</div>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-surface-2 rounded-pill px-2 py-0.5">
              {icon}
              {channel}
            </span>
            {client.amount && (
              <span className="text-xs text-gray-500">{client.amount}</span>
            )}
            {sent && (
              <span className="text-xs text-status-solid bg-status-solid-bg border border-status-solid/30 rounded-pill px-2 py-0.5 font-medium">
                Envoyé
              </span>
            )}
          </div>
        </div>
      </div>

      {active && (
        <div className="p-4 bg-surface-2/40 border-b border-gray-100">
          <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">
            Message préparé par Oni
          </div>
          <div className="bg-surface-1 border border-gray-200 rounded-card p-3 whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
            {client.message}
          </div>

          {canAdjust && (
            <div className="mt-3 flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => runAdjustment("tone")}
                disabled={!!adjusting}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:border-accent hover:text-accent transition disabled:opacity-40"
              >
                {adjusting === "tone" ? "…" : "Changer le ton"}
              </button>
              <button
                type="button"
                onClick={() => runAdjustment("shorter")}
                disabled={!!adjusting}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:border-accent hover:text-accent transition disabled:opacity-40"
              >
                {adjusting === "shorter" ? "…" : "Plus court"}
              </button>
              <button
                type="button"
                onClick={() => setShowCustom((s) => !s)}
                disabled={!!adjusting}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:border-accent hover:text-accent transition disabled:opacity-40"
              >
                Autre ajustement
              </button>
            </div>
          )}

          {canAdjust && showCustom && (
            <div className="mt-2 flex gap-2 items-start">
              <textarea
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Dis-moi ce que tu veux changer…"
                className="flex-1 min-h-16 p-2 rounded-lg border border-gray-200 text-sm resize-y focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
              <button
                type="button"
                onClick={() => runAdjustment("custom", customInput.trim())}
                disabled={!!adjusting || customInput.trim().length === 0}
                className="text-xs font-medium px-3 py-2 rounded-lg bg-accent text-white hover:bg-accent-dark transition disabled:opacity-40"
              >
                {adjusting === "custom" ? "…" : "Appliquer"}
              </button>
            </div>
          )}

          {!canAdjust && adjustCount >= MAX_ADJUSTMENTS && !sent && (
            <div className="mt-3 text-xs text-gray-500">
              On y va avec ça — l&apos;important c&apos;est d&apos;envoyer, pas
              de perfectionner.
            </div>
          )}

          {adjustError && (
            <div className="mt-2 text-xs text-status-critical">{adjustError}</div>
          )}
        </div>
      )}

      {active && (
        <div className="p-3 flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={() => onCopy?.(client.message)}
            className="text-xs font-medium px-3 py-2 rounded-card border border-gray-200 text-gray-700 hover:bg-surface-2 transition-colors"
          >
            Copier
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="text-xs font-medium px-3 py-2 rounded-card border border-gray-200 text-gray-700 hover:bg-surface-2 transition-colors"
          >
            Modifier
          </button>
          <button
            type="button"
            onClick={onMarkSent}
            disabled={sent}
            className="text-xs font-semibold px-3 py-2 rounded-card bg-accent text-white hover:bg-accent-dark disabled:bg-gray-200 disabled:text-gray-500 transition-colors"
          >
            {sent ? "Envoyé ✓" : "C'est envoyé →"}
          </button>
        </div>
      )}
    </div>
  );
}
