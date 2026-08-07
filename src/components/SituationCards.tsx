"use client";

interface Situation {
  id: string;
  title: string;
  subtitle: string;
  prompt: string;
  emoji: string;
  tint: string;
  tintText: string;
}

const SITUATIONS: Situation[] = [
  {
    id: "stuck",
    title: "Je stagne",
    subtitle: "Beaucoup d'efforts, peu de résultats",
    prompt:
      "Je bosse beaucoup mais mon activité ne décolle pas comme je voudrais. J'ai l'impression de tourner en rond.",
    emoji: "📉",
    tint: "bg-amber-100",
    tintText: "text-amber-700",
  },
  {
    id: "visibility",
    title: "Personne ne me voit",
    subtitle: "Manque de prospects entrants",
    prompt:
      "J'ai du mal à trouver des clients. On me voit peu et je ne sais pas où me montrer sans y passer ma vie.",
    emoji: "👁",
    tint: "bg-sky-100",
    tintText: "text-sky-700",
  },
  {
    id: "pricing",
    title: "Je vends trop peu cher",
    subtitle: "Difficulté à valoriser mon offre",
    prompt:
      "Je pense que je facture trop bas et je n'arrive pas à justifier des prix plus élevés. Les clients rechignent dès que je monte.",
    emoji: "💰",
    tint: "bg-emerald-100",
    tintText: "text-emerald-700",
  },
  {
    id: "overwhelmed",
    title: "Je suis débordé·e",
    subtitle: "Trop de choses, pas assez de clarté",
    prompt:
      "J'ai trop de choses à faire en même temps, je ne sais plus par où commencer et j'ai peur de me disperser.",
    emoji: "⏱",
    tint: "bg-pink-100",
    tintText: "text-pink-700",
  },
];

interface Props {
  onSelect: (prompt: string) => void;
}

export function SituationCards({ onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {SITUATIONS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect(s.prompt)}
          className="group text-left rounded-2xl border border-gray-100 bg-white hover:border-accent/40 hover:shadow-card transition-all px-3.5 py-3 flex items-center gap-3"
        >
          <span
            className={`h-10 w-10 shrink-0 rounded-xl ${s.tint} ${s.tintText} flex items-center justify-center text-[18px] transition-transform group-hover:scale-105`}
            aria-hidden
          >
            {s.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold text-gray-900 leading-tight">
              {s.title}
            </div>
            <div className="text-[11.5px] text-gray-500 mt-0.5 truncate">
              {s.subtitle}
            </div>
          </div>
          <span className="h-6 w-6 shrink-0 rounded-full border border-gray-200 text-gray-400 group-hover:border-accent group-hover:text-accent flex items-center justify-center transition-colors">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
        </button>
      ))}
    </div>
  );
}
