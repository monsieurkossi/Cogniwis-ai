"use client";

interface Situation {
  id: string;
  title: string;
  prompt: string;
}

const SITUATIONS: Situation[] = [
  {
    id: "stuck",
    title: "Je stagne",
    prompt:
      "Je bosse beaucoup mais mon activité ne décolle pas comme je voudrais. J'ai l'impression de tourner en rond.",
  },
  {
    id: "visibility",
    title: "Personne ne me voit",
    prompt:
      "J'ai du mal à trouver des clients. On me voit peu et je ne sais pas où me montrer sans y passer ma vie.",
  },
  {
    id: "pricing",
    title: "Je vends trop peu cher",
    prompt:
      "Je pense que je facture trop bas et je n'arrive pas à justifier des prix plus élevés. Les clients rechignent dès que je monte.",
  },
  {
    id: "overwhelmed",
    title: "Je suis débordé·e",
    prompt:
      "J'ai trop de choses à faire en même temps, je ne sais plus par où commencer et j'ai peur de me disperser.",
  },
];

interface Props {
  onSelect: (prompt: string) => void;
}

export function SituationCards({ onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {SITUATIONS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect(s.prompt)}
          className="text-[12.5px] text-gray-700 bg-white border border-gray-200 hover:border-gray-300 hover:bg-surface-2 hover:text-gray-900 px-3 py-1.5 rounded-full transition-colors"
        >
          {s.title}
        </button>
      ))}
    </div>
  );
}
