"use client";

interface Situation {
  id: string;
  title: string;
  subtitle: string;
  prompt: string;
  tint: {
    /** Fond du carré icône, ex: bg-amber-100 */
    bg: string;
    /** Couleur de l'icône, ex: text-amber-600 */
    text: string;
  };
  icon: React.ReactNode;
}

const SITUATIONS: Situation[] = [
  {
    id: "stuck",
    title: "Je stagne",
    subtitle: "Beaucoup d'efforts, peu de résultats",
    prompt:
      "Je bosse beaucoup mais mon activité ne décolle pas comme je voudrais. J'ai l'impression de tourner en rond.",
    tint: { bg: "bg-amber-100", text: "text-amber-600" },
    icon: <path d="M12 20V10M18 20V4M6 20v-6" />,
  },
  {
    id: "visibility",
    title: "Personne ne me voit",
    subtitle: "Manque de prospects entrants",
    prompt:
      "J'ai du mal à trouver des clients. On me voit peu et je ne sais pas où me montrer sans y passer ma vie.",
    tint: { bg: "bg-sky-100", text: "text-sky-600" },
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      </>
    ),
  },
  {
    id: "pricing",
    title: "Je vends trop peu cher",
    subtitle: "Difficulté à valoriser mon offre",
    prompt:
      "Je pense que je facture trop bas et je n'arrive pas à justifier des prix plus élevés. Les clients rechignent dès que je monte.",
    tint: { bg: "bg-emerald-100", text: "text-emerald-600" },
    icon: (
      <>
        <line x1="12" x2="12" y1="2" y2="22" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </>
    ),
  },
  {
    id: "overwhelmed",
    title: "Je suis débordé·e",
    subtitle: "Trop de choses, pas assez de clarté",
    prompt:
      "J'ai trop de choses à faire en même temps, je ne sais plus par où commencer et j'ai peur de me disperser.",
    tint: { bg: "bg-pink-100", text: "text-pink-600" },
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ),
  },
];

interface Props {
  onSelect: (prompt: string) => void;
  variant?: "chips" | "cards";
}

export function SituationCards({ onSelect, variant = "chips" }: Props) {
  // "chips" = grille 2x2 sobre — bordure fine, hover accent, pas de pastel
  if (variant === "chips") {
    return (
      <div className="grid grid-cols-2 gap-3">
        {SITUATIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.prompt)}
            className="group text-left rounded-2xl border border-gray-100 bg-white/70 hover:border-accent/40 hover:bg-white transition-all px-4 py-3.5"
          >
            <p className="text-[13.5px] font-semibold text-gray-900 group-hover:text-accent transition-colors leading-tight">
              {s.title}
            </p>
            <p className="text-[11.5px] text-gray-400 mt-1 leading-snug">
              {s.subtitle}
            </p>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {SITUATIONS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect(s.prompt)}
          className="chip-3d group text-left p-4"
        >
          <div className="flex items-start gap-3">
            <span
              className={`h-9 w-9 shrink-0 rounded-xl ${s.tint.bg} ${s.tint.text} flex items-center justify-center`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {s.icon}
              </svg>
            </span>
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 group-hover:text-accent-dark">
                {s.title}
              </div>
              <div className="text-sm text-gray-500 mt-0.5">{s.subtitle}</div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
