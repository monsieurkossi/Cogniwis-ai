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

export async function POST(request: NextRequest) {
  const { conversationId } = (await request.json()) as { conversationId?: string };
  if (!conversationId) {
    return Response.json({ error: "conversationId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // Reuse existing diagnostic if present
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
  const anthropic = getAnthropic();

  const messages = [
    ...conversationMessages.map((m) => ({ role: m.role, content: m.content })),
    ...(convo.recap
      ? [
          {
            role: "user" as const,
            content: `Récap validé :\n\n${convo.recap}`,
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
    return Response.json({ error: message }, { status: 500 });
  }

  const textBlock = response.content.find((c) => c.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
  let parsed: DiagnosticPayload;
  try {
    parsed = JSON.parse(stripJsonFences(raw)) as DiagnosticPayload;
  } catch {
    return Response.json(
      { error: "Réponse Oni non parsable en JSON", raw },
      { status: 502 }
    );
  }
  const diagnostic = normalizeDiagnostic(parsed);

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

  // Refresh profile with declared/real objectives
  await supabase
    .from("profiles")
    .update({
      declared_objective: diagnostic.declared_objective,
      real_objective: diagnostic.real_objective,
    })
    .eq("id", user.id);

  return Response.json({ diagnostic: inserted, reused: false });
}
