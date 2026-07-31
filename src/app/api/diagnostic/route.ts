import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, ONI_MODEL } from "@/lib/anthropic";
import { ONI_SYSTEM_PROMPT, DIAGNOSTIC_INSTRUCTION } from "@/lib/prompts/oni-system";
import type { ChatMessage, DiagnosticPayload } from "@/lib/types";
import { PILLAR_NAMES, statusFromScore } from "@/lib/types";

export const runtime = "nodejs";

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) return fence[1].trim();
  return trimmed;
}

function normalizeDiagnostic(raw: DiagnosticPayload): DiagnosticPayload {
  const byName = new Map(raw.pillars.map((p) => [p.name, p]));
  const pillars = PILLAR_NAMES.map((name) => {
    const p = byName.get(name);
    if (!p) {
      return {
        name,
        score: 50,
        status: statusFromScore(50),
        priority_score: 0,
        diagnosis: "Non évalué — informations insuffisantes.",
        actions: [],
      };
    }
    return { ...p, status: statusFromScore(p.score) };
  });
  return { ...raw, pillars };
}

interface DiagnosticRequestBody {
  conversationId?: string;
  messages?: ChatMessage[];
  recap?: string | null;
}

async function generateDiagnostic(
  conversationMessages: ChatMessage[],
  recap: string | null
): Promise<{ diagnostic: DiagnosticPayload } | { error: string; raw?: string; status: number }> {
  if (conversationMessages.length === 0 && !recap) {
    return { error: "conversation vide", status: 400 };
  }
  const anthropic = getAnthropic();
  const messages = [
    ...conversationMessages.map((m) => ({ role: m.role, content: m.content })),
    ...(recap
      ? [
          {
            role: "user" as const,
            content: `Récap validé :\n\n${recap}`,
          },
        ]
      : []),
    { role: "user" as const, content: DIAGNOSTIC_INSTRUCTION },
  ];

  let response;
  try {
    response = await anthropic.messages.create({
      model: ONI_MODEL,
      max_tokens: 4096,
      system: ONI_SYSTEM_PROMPT,
      messages,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "erreur Anthropic";
    return { error: message, status: 500 };
  }

  const textBlock = response.content.find((c) => c.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
  try {
    const parsed = JSON.parse(stripJsonFences(raw)) as DiagnosticPayload;
    return { diagnostic: normalizeDiagnostic(parsed) };
  } catch {
    return { error: "Réponse Oni non parsable en JSON", raw, status: 502 };
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as DiagnosticRequestBody;

  // Mode anonyme : payload direct, pas d'auth, pas de DB
  if (body.messages && body.messages.length > 0) {
    const result = await generateDiagnostic(body.messages, body.recap ?? null);
    if ("error" in result) {
      return Response.json(
        { error: result.error, raw: result.raw },
        { status: result.status }
      );
    }
    // On renvoie un id éphémère pour rester compatible avec les composants aval.
    return Response.json({
      diagnostic: {
        id: `anon-${Date.now()}`,
        user_id: null,
        conversation_id: null,
        cycle_number: 1,
        created_at: new Date().toISOString(),
        ...result.diagnostic,
      },
      reused: false,
      anonymous: true,
    });
  }

  // Mode connecté : conversationId → Supabase
  const conversationId = body.conversationId;
  if (!conversationId) {
    return Response.json({ error: "conversationId ou messages requis" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from("diagnostics")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return Response.json({ diagnostic: existing, reused: true });
  }

  const { data: convo, error: convoErr } = await supabase
    .from("conversations")
    .select("id, messages, recap")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (convoErr || !convo) {
    return Response.json({ error: "conversation not found" }, { status: 404 });
  }

  const conversationMessages = (convo.messages as ChatMessage[]) ?? [];
  const result = await generateDiagnostic(conversationMessages, convo.recap ?? null);
  if ("error" in result) {
    return Response.json(
      { error: result.error, raw: result.raw },
      { status: result.status }
    );
  }
  const diagnostic = result.diagnostic;

  const { data: inserted, error: insertErr } = await supabase
    .from("diagnostics")
    .insert({
      user_id: user.id,
      conversation_id: conversationId,
      cycle_number: 1,
      verdict: diagnostic.verdict,
      reframing: diagnostic.reframing,
      reasoning: diagnostic.reasoning,
      global_score: diagnostic.global_score,
      pillars: diagnostic.pillars,
      priority_pillar: diagnostic.priority_pillar,
      active_rules: diagnostic.active_rules,
    })
    .select("*")
    .single();

  if (insertErr) {
    return Response.json({ error: insertErr.message }, { status: 500 });
  }

  await supabase
    .from("profiles")
    .update({
      declared_objective: diagnostic.declared_objective,
      real_objective: diagnostic.real_objective,
    })
    .eq("id", user.id);

  return Response.json({ diagnostic: inserted, reused: false });
}
