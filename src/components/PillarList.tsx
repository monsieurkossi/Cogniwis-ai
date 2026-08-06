import type { DiagnosticPayload } from "@/lib/types";
import { PillarCard } from "./PillarCard";

interface Props {
  diagnostic: DiagnosticPayload;
  /** "grid" = bento compact 2/3 col, "stack" = liste verticale expandable. */
  layout?: "grid" | "stack";
}

export function PillarList({ diagnostic, layout = "grid" }: Props) {
  if (layout === "stack") {
    return (
      <div className="space-y-3">
        {diagnostic.pillars.map((p) => (
          <PillarCard
            key={p.name}
            pillar={p}
            priority={p.name === diagnostic.priority_pillar}
            defaultOpen={p.name === diagnostic.priority_pillar}
          />
        ))}
      </div>
    );
  }

  // Priorité en tête, puis triés par score croissant (les plus urgents d'abord).
  const priority = diagnostic.pillars.find(
    (p) => p.name === diagnostic.priority_pillar
  );
  const rest = diagnostic.pillars
    .filter((p) => p.name !== diagnostic.priority_pillar)
    .sort((a, b) => a.score - b.score);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {priority && (
        <div className="col-span-2 lg:col-span-1 row-span-1">
          <PillarCard pillar={priority} priority variant="compact" />
        </div>
      )}
      {rest.map((p) => (
        <PillarCard key={p.name} pillar={p} variant="compact" />
      ))}
    </div>
  );
}
