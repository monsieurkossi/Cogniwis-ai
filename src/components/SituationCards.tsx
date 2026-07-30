"use client";

interface Situation {
  id: string;
  title: string;
  subtitle: string;
  prompt: string;
}

const SITUATIONS: Situation[] = [
  {
    id: "stuck",
    title: "Je stagne",
    subtitle: "Beaucoup d'efforts, peu de résultats",
    prompt:
      "Je bosse beaucoup mais mon activité ne décolle pas comme je voudrais. J'ai l'impression de tourner en rond.",
  },
  {
    id: "visibility",
    title: "Personne ne me voit",
    subtitle: "Manque de prospects entrants",
    prompt:
      "J'ai du mal à trouver des clients. On me voit peu et je ne sais pas où me montrer sans y passer ma vie.",
  },
  {
    id: "pricing",
    title: "Je vends trop peu cher",
    subtitle: "Difficulté à valoriser mon offre",
    prompt:
      "Je pense que je facture trop bas et je n'arrive pas à justifier des prix plus élevés. Les clients rechignent dès que je monte.",
  },
  {
    id: "overwhelmed",
    title: "Je suis débordé·e",
    subtitle: "Trop de choses, pas assez de clarté",
    prompt:
      "J'ai trop de choses à faire en même temps, je ne sais plus par où commencer et j'ai peur de me disperser.",
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
          className="group text-left p-4 bg-surface-1 border border-gray-200 rounded-card hover:border-accent hover:shadow-card transition-all"
        >
          <div className="font-semibold text-gray-900 group-hover:text-accent-dark">
            {s.title}
          </div>
          <div className="text-sm text-gray-500 mt-1">{s.subtitle}</div>
          <div className="text-xs text-accent mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            Cliquer pour en parler à Oni →
          </div>
        </button>
      ))}
    </div>
  );
}
