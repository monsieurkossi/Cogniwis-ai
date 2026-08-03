import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, ONI_MODEL } from "@/lib/anthropic";
import { ONI_SYSTEM_PROMPT } from "@/lib/prompts/oni-system";

export const runtime = "nodejs";
export const maxDuration = 60;

function extractJSON<T = unknown>(text: string): T {
  const cleaned = text
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) {
      throw new Error("Aucun JSON trouvé dans la réponse");
    }
    const slice = cleaned.substring(first, last + 1);
    try {
      return JSON.parse(slice) as T;
    } catch {
      const controlChars = new RegExp("[\\u0000-\\u001F]+", "g");
      const sanitized = slice
        .replace(controlChars, " ")
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]");
      return JSON.parse(sanitized) as T;
    }
  }
}

interface Verbatim {
  contact_name: string;
  channel: string;
  text: string;
}

export interface VerbatimAnalysis {
  patterns: string[];
  convergence: boolean;
  angle: string | null;
  analysis_oni: string;
  next_action: {
    title: string;
    description: string;
    kpi: string;
  };
  tags_per_contact: Array<{
    name: string;
    tags: string[];
  }>;
}

interface AnalyzeRequestBody {
  actionId?: string;
  diagnosticId?: string;
  verbatims?: Verbatim[];
}

function buildPrompt(verbatims: Verbatim[]): string {
  const formatted = verbatims
    .map(
      (v, i) =>
        `${i + 1}. **${v.contact_name}** (via ${v.channel}) :\n"${v.text.trim()}"`
    )
    .join("\n\n");

  return `Tu es Oni. L'utilisateur a contacté des prospects et voici leurs réponses mot pour mot :

${formatted}

Analyse ces réponses :
1. Quels mots ou idées reviennent dans plusieurs réponses ?
2. Les réponses convergent-elles vers un même problème/besoin ?
3. Si oui, formule un angle de positionnement clair
4. Si non, explique la divergence et ce qu'il faut creuser

Réponds UNIQUEMENT en JSON :
{
  "patterns": ["mot ou idée récurrente 1", "mot 2"],
  "convergence": true ou false,
  "angle": "l'angle formulé si convergence, null sinon",
  "analysis_oni": "2-3 phrases en ton Oni expliquant ce qu'on a trouvé",
  "next_action": {
    "title": "titre de la prochaine action",
    "description": "ce qu'on fait maintenant avec cet angle",
    "kpi": "mesure de succès"
  },
  "tags_per_contact": [
    ${verbatims
      .map(
        (v) =>
          `{"name": "${v.contact_name.replace(/"/g, '\\"')}", "tags": ["tag1", "tag2"]}`
      )
      .join(",\n    ")}
  ]
}

Commence par { et termine par }. Rien d'autre.`;
}

export async function POST(request: NextRequest) {
  let body: AnalyzeRequestBody;
  try {
    body = (await request.json()) as AnalyzeRequestBody;
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const verbatims = (body.verbatims ?? []).filter(
    (v): v is Verbatim =>
      !!v && typeof v.text === "string" && v.text.trim().length > 0
  );

  if (verbatims.length < 2) {
    return Response.json(
      { error: "Il faut au moins 2 verbatims pour lancer l'analyse." },
      { status: 400 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "missing_anthropic_key" },
      { status: 500 }
    );
  }

  const anthropic = getAnthropic();
  let response;
  try {
    response = await anthropic.messages.create({
      model: ONI_MODEL,
      max_tokens: 2048,
      // Extraction JSON structurée — pas besoin de thinking (défaut adaptive
      // sur Sonnet 5 = latence sans gain qualitatif ici).
      thinking: { type: "disabled" },
      system: ONI_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildPrompt(verbatims) }],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "erreur Anthropic";
    console.error("[analyze-verbatims] Erreur Claude:", message);
    return Response.json(
      { error: message, debug: `[Claude API error] ${message}` },
      { status: 500 }
    );
  }

  const textBlock = response.content.find((c) => c.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";

  let analysis: VerbatimAnalysis;
  try {
    analysis = extractJSON<VerbatimAnalysis>(raw);
  } catch (err) {
    console.error(
      "[analyze-verbatims] Parsing JSON échoué. Réponse brute:",
      raw.substring(0, 800),
      "erreur:",
      err instanceof Error ? err.message : err
    );
    return Response.json(
      {
        error: "analyze_parse_failed",
        debug: raw.substring(0, 500) || "(réponse vide)",
      },
      { status: 502 }
    );
  }

  // Persistance côté Supabase pour les actions connectées uniquement.
  if (body.actionId && !body.actionId.startsWith("anon-")) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("actions")
          .update({
            kpi_result: JSON.stringify(analysis),
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", body.actionId)
          .eq("user_id", user.id);
      }
    } catch (err) {
      // Persistance best-effort : on log mais on renvoie l'analyse quand même.
      console.error(
        "[analyze-verbatims] Persistance Supabase échouée:",
        err instanceof Error ? err.message : err
      );
    }
  }

  return Response.json({ analysis });
}
