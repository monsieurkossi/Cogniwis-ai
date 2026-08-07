interface Step {
  icon: string;
  title: string;
  subtitle: string;
  highlight: boolean;
}

const STEPS: Step[] = [
  {
    icon: "💬",
    title: "5 min de conversation",
    subtitle: "Oni te pose quelques questions ciblées",
    highlight: false,
  },
  {
    icon: "✅",
    title: "Récap à valider",
    subtitle: "Tu vérifies avant l'analyse",
    highlight: false,
  },
  {
    icon: "📊",
    title: "Diagnostic 7 piliers",
    subtitle: "Score, points forts, urgences",
    highlight: true,
  },
  {
    icon: "🎯",
    title: "1 action concrète",
    subtitle: "Message prêt + KPI de succès",
    highlight: true,
  },
];

export function WhatHappensNext() {
  return (
    <div className="w-full">
      <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400 text-center mb-4 font-semibold">
        Ce qui va se passer
      </p>

      {/* Desktop : timeline horizontale avec connecteurs */}
      <div className="hidden sm:flex items-stretch justify-center gap-0">
        {STEPS.map((step, i) => (
          <div key={i} className="flex items-center">
            <div
              className={`
                flex flex-col items-center text-center px-3 py-3.5 rounded-2xl
                w-[152px] min-h-[112px] transition-all
                ${
                  step.highlight
                    ? "bg-accent-light border border-accent/15"
                    : "bg-white/60 border border-gray-100"
                }
              `}
            >
              <span className="text-[22px] leading-none mb-2">{step.icon}</span>
              <p className="text-[12.5px] font-semibold text-gray-900 leading-tight">
                {step.title}
              </p>
              <p className="text-[10.5px] text-gray-500 mt-1 leading-snug">
                {step.subtitle}
              </p>
            </div>

            {i < STEPS.length - 1 && (
              <div className="w-4 h-px bg-gray-200 shrink-0 mt-0" />
            )}
          </div>
        ))}
      </div>

      {/* Mobile : liste verticale compacte */}
      <div className="sm:hidden space-y-2">
        {STEPS.map((step, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 rounded-2xl px-3.5 py-3 ${
              step.highlight
                ? "bg-accent-light border border-accent/15"
                : "bg-white/60 border border-gray-100"
            }`}
          >
            <span className="text-lg leading-none shrink-0">{step.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-gray-900 leading-tight">
                {step.title}
              </p>
              <p className="text-[11.5px] text-gray-500 mt-0.5 leading-snug">
                {step.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-[11px] text-gray-400 mt-4">
        Tout ça en moins de 10 minutes — et c&apos;est gratuit.
      </p>
    </div>
  );
}
