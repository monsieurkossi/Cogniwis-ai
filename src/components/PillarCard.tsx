"use client";

import { useState } from "react";
import type { Pillar } from "@/lib/types";

const STATUS_STYLES = {
  critique: {
    bar: "bg-status-critical",
    badge: "bg-status-critical-bg text-status-critical border-status-critical/30",
    label: "Critique",
  },
  fragile: {
    bar: "bg-status-fragile",
    badge: "bg-status-fragile-bg text-status-fragile border-status-fragile/30",
    label: "Fragile",
  },
  solide: {
    bar: "bg-status-solid",
    badge: "bg-status-solid-bg text-status-solid border-status-solid/30",
    label: "Solide",
  },
} as const;

interface Props {
  pillar: Pillar;
  priority?: boolean;
  defaultOpen?: boolean;
}

export function PillarCard({ pillar, priority = false, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const style = STATUS_STYLES[pillar.status];

  return (
    <div
      className={`relative bg-surface-1 rounded-card border shadow-card overflow-hidden transition-all ${
        priority ? "border-accent ring-1 ring-accent/30" : "border-gray-200"
      }`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.bar}`} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 pl-5 pr-4 py-4 hover:bg-surface-2/40 transition-colors text-left"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900">{pillar.name}</h3>
              <span
                className={`text-xs px-2 py-0.5 rounded-pill border font-medium ${style.badge}`}
              >
                {style.label}
              </span>
              {priority && (
                <span className="text-xs px-2 py-0.5 rounded-pill border font-medium bg-accent-light text-accent-dark border-accent/30">
                  Priorité
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
              {pillar.diagnosis}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-xl font-bold text-gray-900">{pillar.score}</div>
            <div className="text-xs text-gray-400">/100</div>
          </div>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="pl-5 pr-4 pb-4 border-t border-gray-100">
          <p className="text-sm text-gray-700 pt-3 pb-4">{pillar.diagnosis}</p>
          {pillar.actions.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-gray-400 font-semibold">
                Actions
              </div>
              {pillar.actions.map((a, idx) => {
                const locked = idx > 0;
                return (
                  <div
                    key={a.step}
                    className={`flex gap-3 p-3 rounded-card border ${
                      locked
                        ? "border-gray-100 bg-surface-2/40 opacity-70"
                        : "border-gray-200 bg-surface-1"
                    }`}
                  >
                    <div
                      className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${
                        locked
                          ? "bg-gray-200 text-gray-500"
                          : "bg-accent text-white"
                      }`}
                    >
                      {locked ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <rect width="18" height="11" x="3" y="11" rx="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      ) : (
                        a.step
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900">
                        {a.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {a.estimated_time} · KPI : {a.kpi}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
