import type { DiagnosticPayload } from "@/lib/types";
import { PillarCard } from "./PillarCard";

interface Props {
  diagnostic: DiagnosticPayload;
}

export function PillarList({ diagnostic }: Props) {
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
