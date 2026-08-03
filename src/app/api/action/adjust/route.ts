import type { NextRequest } from "next/server";
import { getAnthropic, ONI_MODEL } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 30;

type AdjustmentType = "tone" | "shorter" | "custom";

interface AdjustBody {
  original_content?: string;
  adjustment_type?: AdjustmentType;
  custom_instruction?: string | null;
}

const INSTRUCTION_BY_TYPE: Record<AdjustmentType, string> = {
  tone: "Change le ton : rends-le plus naturel, moins marketing, plus proche du parlé du user. Garde exactement le même sens et la même longueur approximative.",
  shorter:
    "Rends le message nettement plus court (au moins 30% de mots en moins) sans perdre l'essentiel. Coupe les formules de politesse superflues.",
  custom: "",
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as AdjustBody | null;
  const original = body?.original_content?.trim();
  const type = body?.adjustment_type;

  if (!original || !type) {
    return Response.json(
      { error: "original_content et adjustment_type requis" },
      { status: 400 }
    );
  }
  if (type !== "tone" && type !== "shorter" && type !== "custom") {
    return Response.json({ error: "adjustment_type invalide" }, { status: 400 });
  }

  const custom = body?.custom_instruction?.trim();
  if (type === "custom" && !custom) {
    return Response.json(
      { error: "custom_instruction requis pour type 'custom'" },
      { status: 400 }
    );
  }

  const instruction =
    type === "custom" ? (custom as string) : INSTRUCTION_BY_TYPE[type];

  const prompt = `Voici un message que tu as rédigé pour un utilisateur :

"""
${original}
"""

Ajustement demandé : ${instruction}

Réécris le message en appliquant l'ajustement. Garde le même format, le même destinataire, le même objectif. Réponds UNIQUEMENT avec le nouveau texte du message, rien d'autre. Pas de "Voici", pas de guillemets, pas de commentaire.`;

  const anthropic = getAnthropic();
  let response;
  try {
    response = await anthropic.messages.create({
      model: ONI_MODEL,
      max_tokens: 1024,
      thinking: { type: "disabled" },
      messages: [{ role: "user", content: prompt }],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "erreur Anthropic";
    return Response.json({ error: message }, { status: 500 });
  }

  const textBlock = response.content.find((c) => c.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
  const content = raw
    .trim()
    // Supprime des guillemets englobants éventuels
    .replace(/^"""\s*|\s*"""$/g, "")
    .replace(/^"|"$/g, "")
    .trim();

  if (!content) {
    return Response.json({ error: "réponse vide du modèle" }, { status: 502 });
  }

  return Response.json({ content, adjustment_applied: type });
}
