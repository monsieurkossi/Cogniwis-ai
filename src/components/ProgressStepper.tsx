const STEPS = ["Diagnostic", "Action", "Suivi", "Réajustement"] as const;
export type StepperStep = (typeof STEPS)[number];

interface Props {
  active: StepperStep;
  done?: StepperStep[];
}

export function ProgressStepper({ active, done = [] }: Props) {
  const activeIdx = STEPS.indexOf(active);
  return (
    <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
      {STEPS.map((step, idx) => {
        const isActive = step === active;
        const isDone = done.includes(step) || idx < activeIdx;
        return (
          <div key={step} className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border ${
                  isActive
                    ? "bg-accent text-white border-accent"
                    : isDone
                      ? "bg-status-solid text-white border-status-solid"
                      : "bg-surface-1 text-gray-400 border-gray-200"
                }`}
              >
                {isDone && !isActive ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`text-sm font-medium ${
                  isActive
                    ? "text-accent-dark"
                    : isDone
                      ? "text-gray-700"
                      : "text-gray-400"
                }`}
              >
                {step}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`h-px w-4 sm:w-8 ${
                  isDone ? "bg-status-solid" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
