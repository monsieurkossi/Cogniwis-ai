"use client";

interface Props {
  pillarName: string;
  currentStep: number;
  totalSteps: number;
  deliverablesSent: number;
  deliverablesTotal: number;
  kpiLabel: string;
  kpiCurrent: number;
  kpiTarget: number;
}

function Bar({ value, max }: { value: number; max: number }) {
  const pct =
    max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-accent transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ProgressTracker({
  pillarName,
  currentStep,
  totalSteps,
  deliverablesSent,
  deliverablesTotal,
  kpiLabel,
  kpiCurrent,
  kpiTarget,
}: Props) {
  const totalSafe = Math.max(1, totalSteps || 1);
  const stepSafe = Math.min(currentStep || 1, totalSafe);

  const nextHint = (() => {
    if (deliverablesTotal > 0 && deliverablesSent === 0) {
      return "Envoie le premier message pour lancer le compteur";
    }
    if (deliverablesSent > 0 && kpiCurrent === 0) {
      return "En attente des retours — reviens quand tu as des réponses";
    }
    if (kpiTarget > 0 && kpiCurrent < kpiTarget) {
      const remaining = kpiTarget - kpiCurrent;
      return `Encore ${remaining} réponse${remaining > 1 ? "s" : ""} pour débloquer l'analyse`;
    }
    if (kpiTarget > 0 && kpiCurrent >= kpiTarget) {
      return "Objectif atteint — tu peux lancer l'analyse ✓";
    }
    return null;
  })();

  return (
    <div className="sticky top-2 z-10 bg-surface-1 border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2 text-sm">
          <span aria-hidden>📍</span>
          <span className="font-semibold text-gray-900">{pillarName}</span>
          <span className="text-gray-500">
            — Étape {stepSafe}/{totalSafe}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {deliverablesTotal > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Messages envoyés</span>
              <span className="font-medium text-gray-900">
                {deliverablesSent}/{deliverablesTotal}
              </span>
            </div>
            <Bar value={deliverablesSent} max={deliverablesTotal} />
          </div>
        )}

        {kpiTarget > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>{kpiLabel}</span>
              <span className="font-medium text-gray-900">
                {kpiCurrent}/{kpiTarget} (objectif)
              </span>
            </div>
            <Bar value={kpiCurrent} max={kpiTarget} />
          </div>
        )}
      </div>

      {nextHint && (
        <div className="mt-3 text-xs text-accent-dark">→ {nextHint}</div>
      )}
    </div>
  );
}
