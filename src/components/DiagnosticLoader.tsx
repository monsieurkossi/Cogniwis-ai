"use client";

import { useEffect, useState } from "react";
import { OniAvatar } from "./OniAvatar";

const STEPS = [
  { label: "Analyse de tes réponses", duration: 2000 },
  { label: "Évaluation de tes 7 piliers", duration: 3000 },
  { label: "Application des règles de décision", duration: 2500 },
  { label: "Calcul des priorités", duration: 2000 },
  { label: "Préparation du verdict", duration: 1500 },
] as const;

interface Props {
  done?: boolean;
}

export function DiagnosticLoader({ done = false }: Props) {
  const [current, setCurrent] = useState(0);
  const totalDuration = STEPS.reduce((s, x) => s + x.duration, 0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (done) {
      setCurrent(STEPS.length);
      setElapsed(totalDuration);
      return;
    }
    let cancelled = false;
    let idx = 0;
    const advance = () => {
      if (cancelled) return;
      if (idx >= STEPS.length - 1) {
        // stop on last step, wait for `done`
        setCurrent(STEPS.length - 1);
        return;
      }
      idx += 1;
      setCurrent(idx);
      window.setTimeout(advance, STEPS[idx].duration);
    };
    const firstTimer = window.setTimeout(advance, STEPS[0].duration);

    const startedAt = Date.now();
    const progressTimer = window.setInterval(() => {
      setElapsed(Math.min(Date.now() - startedAt, totalDuration - 200));
    }, 80);

    return () => {
      cancelled = true;
      window.clearTimeout(firstTimer);
      window.clearInterval(progressTimer);
    };
  }, [done, totalDuration]);

  const progressPct = done
    ? 100
    : Math.min(98, (elapsed / totalDuration) * 100);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-surface/95 backdrop-blur-sm px-4">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <OniAvatar size={120} speaking />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">
          Oni analyse ton activité…
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Quelques secondes, je te prépare ton diagnostic complet.
        </p>

        <ul className="mt-8 space-y-2.5 text-left">
          {STEPS.map((s, i) => {
            const state =
              i < current
                ? "done"
                : i === current
                  ? "active"
                  : "pending";
            return (
              <li
                key={s.label}
                className={`flex items-center gap-3 text-sm transition-all ${
                  state === "pending" ? "opacity-40" : "opacity-100"
                }`}
              >
                <span
                  className={`h-5 w-5 shrink-0 rounded-full flex items-center justify-center border transition-all ${
                    state === "done"
                      ? "bg-status-solid border-status-solid text-white"
                      : state === "active"
                        ? "border-accent bg-accent-light text-accent-dark"
                        : "border-gray-300 bg-surface-1 text-gray-400"
                  }`}
                >
                  {state === "done" ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : state === "active" ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                  )}
                </span>
                <span
                  className={`${
                    state === "active"
                      ? "text-gray-900 font-medium"
                      : state === "done"
                        ? "text-gray-600"
                        : "text-gray-500"
                  }`}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="mt-8">
          <div className="h-1 w-full rounded-full bg-surface-2 overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-200 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
