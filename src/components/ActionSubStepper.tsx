"use client";

export type ActionPhase =
  | "preparation"
  | "envoi"
  | "attente"
  | "analyse"
  | "resultat";

interface Props {
  phase: ActionPhase;
}

const STEPS: { id: ActionPhase; label: string; hint: string }[] = [
  { id: "preparation", label: "Préparation", hint: "Livrable prêt" },
  { id: "envoi", label: "Envoi", hint: "Messages sortants" },
  { id: "attente", label: "Retours", hint: "Verbatims collectés" },
  { id: "analyse", label: "Analyse", hint: "Patterns détectés" },
  { id: "resultat", label: "Prochaine étape", hint: "Action débloquée" },
];

export function ActionSubStepper({ phase }: Props) {
  const activeIdx = STEPS.findIndex((s) => s.id === phase);
  return (
    <div className="rounded-2xl bg-surface-1 border border-gray-200 p-4 shadow-card">
      <div className="text-[10px] uppercase tracking-[0.16em] text-gray-500 font-semibold flex items-center gap-2 mb-3">
        <span className="h-1 w-1 rounded-full bg-accent" />
        Cycle d&apos;action
      </div>
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const isDone = i < activeIdx;
          const isActive = i === activeIdx;
          return (
            <div key={s.id} className="flex items-center gap-1 shrink-0">
              <div
                className={`flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-pill border transition-colors ${
                  isActive
                    ? "border-accent bg-accent-light shadow-card"
                    : isDone
                      ? "border-status-solid/30 bg-status-solid-bg"
                      : "border-gray-200 bg-surface-1"
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                    isActive
                      ? "bg-accent text-white"
                      : isDone
                        ? "bg-status-solid text-white"
                        : "bg-surface-2 text-gray-400 border border-gray-200"
                  }`}
                >
                  {isDone ? (
                    <svg
                      width="9"
                      height="9"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <div className="text-left leading-none">
                  <div
                    className={`text-[12px] font-semibold ${
                      isActive
                        ? "text-accent-dark"
                        : isDone
                          ? "text-status-solid"
                          : "text-gray-500"
                    }`}
                  >
                    {s.label}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {s.hint}
                  </div>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px w-5 ${
                    isDone ? "bg-status-solid/40" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
