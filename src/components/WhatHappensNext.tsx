interface Step {
  title: string;
  subtitle: string;
  highlight: "none" | "soft" | "solid";
}

const STEPS: Step[] = [
  {
    title: "Conversation avec Oni · 5 min",
    subtitle: "Questions ciblées. Il creuse jusqu'à comprendre.",
    highlight: "none",
  },
  {
    title: "Récap à valider",
    subtitle: "Tu vérifies que tout est correct avant l'analyse.",
    highlight: "none",
  },
  {
    title: "Diagnostic sur 7 piliers",
    subtitle:
      "Score chiffré, points forts, urgences. Zéro langue de bois.",
    highlight: "soft",
  },
  {
    title: "1 action concrète à lancer",
    subtitle:
      "Message prêt à envoyer, KPI de succès défini. Dès aujourd'hui.",
    highlight: "solid",
  },
];

export function WhatHappensNext() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white/60 backdrop-blur px-4 py-4 sm:px-5 sm:py-5">
      <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-semibold mb-3">
        Ce qui va se passer
      </div>
      <div className="relative pl-1">
        <div
          aria-hidden
          className="absolute left-[13px] top-3 bottom-3 w-[2px] bg-gradient-to-b from-gray-200 via-gray-200 to-accent"
        />
        <div className="grid gap-2">
          {STEPS.map((step, i) => {
            const bg =
              step.highlight === "solid"
                ? "bg-accent"
                : step.highlight === "soft"
                  ? "bg-accent-light"
                  : "";
            const titleColor =
              step.highlight === "solid"
                ? "text-white"
                : step.highlight === "soft"
                  ? "text-accent-dark"
                  : "text-gray-900";
            const subColor =
              step.highlight === "solid"
                ? "text-white/85"
                : step.highlight === "soft"
                  ? "text-accent-dark/80"
                  : "text-gray-500";
            const numBorder =
              step.highlight === "none"
                ? "border-gray-200 text-gray-500"
                : "border-accent text-accent-dark font-bold";

            return (
              <div
                key={step.title}
                className={`flex gap-3.5 items-start relative ${
                  step.highlight !== "none"
                    ? `${bg} -mx-1 pr-3 pl-1 py-2 rounded-xl`
                    : ""
                }`}
              >
                <div
                  className={`w-7 h-7 shrink-0 rounded-full bg-white border-2 flex items-center justify-center text-[11px] font-semibold z-[1] ${
                    step.highlight !== "none" ? "ml-1" : ""
                  } ${numBorder}`}
                >
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className={`text-[13px] font-semibold leading-tight ${titleColor}`}>
                    {step.title}
                  </div>
                  <div className={`text-[11.5px] mt-1 leading-snug ${subColor}`}>
                    {step.subtitle}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
