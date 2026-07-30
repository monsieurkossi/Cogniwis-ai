import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, ONI_MODEL } from "@/lib/anthropic";
import { ONI_SYSTEM_PROMPT, ACTION_INSTRUCTION } from "@/lib/prompts/oni-system";
import type { ActionPayload } from "@/lib/types";

export const runtime = "nodejs";

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) return fence[1].trim();
  return trimmed;
}

export async function POST(request: NextRequest) {
  const { diagnosticId } = (await request.json()) as { diagnosticId?: string };
  if (!diagnosticId) {
    return Response.json({ error: "diagnosticId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // Reuse existing active/pending action for this diagnostic
  const { data: existing } = await supabase
    .from("actions")
    .select("*")
    .eq("diagnostic_id", diagnosticId)
    .eq("user_id", user.id)
    .order("step_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return Response.json({ action: existing, reused: true });
  }

  const { data: diag, error: diagErr } = await supabase
    .from("diagnostics")
    .select("*, conversations(messages, recap)")
    .eq("id", diagnosticId)
    .eq("user_id", user.id)
    .single();

  if (diagErr || !diag) {
    return Response.json({ error: "diagnostic not found" }, { status: 404 });
  }

  const diagContext = {
    verdict: diag.verdict,
    reframing: diag.reframing,
    reasoning: diag.reasoning,
    global_score: diag.global_score,
    priority_pillar: diag.priority_pillar,
    pillars: diag.pillars,
  };

  const anthropic = getAnthropic();

  let response;
  try {
    response = await anthropic.messages.create({
      model: ONI_MODEL,
      max_tokens: 2048,
      system: ONI_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Voici le diagnostic établi précédemment :\n\n${JSON.stringify(
            diagContext,
            null,
            2
          )}\n\n${ACTION_INSTRUCTION}`,
        },
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "erreur Anthropic";
    return Response.json({ error: message }, { status: 500 });
  }

  const textBlock = response.content.find((c) => c.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
  let payload: ActionPayload;
  try {
    payload = JSON.parse(stripJsonFences(raw)) as ActionPayload;
  } catch {
    return Response.json(
      { error: "Réponse Oni non parsable en JSON", raw },
      { status: 502 }
    );
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("actions")
    .insert({
      user_id: user.id,
      diagnostic_id: diagnosticId,
      pillar: payload.pillar,
      step_number: payload.step_number,
      total_steps: payload.total_steps,
      title: payload.title,
      description: payload.description,
      deliverable: payload.deliverable,
      estimated_time: payload.estimated_time,
      kpi_target: payload.kpi_target,
      status: "active",
      clients: payload.clients ?? [],
    })
    .select("*")
    .single();

  if (insertErr) {
    return Response.json({ error: insertErr.message }, { status: 500 });
  }

  return Response.json({ action: inserted, reused: false });
}

export async function PATCH(request: NextRequest) {
  const {
    actionId,
    clients,
    status,
    kpi_result,
  } = (await request.json()) as {
    actionId?: string;
    clients?: unknown;
    status?: string;
    kpi_result?: string;
  };

  if (!actionId) {
    return Response.json({ error: "actionId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const patch: Record<string, unknown> = {};
  if (clients !== undefined) patch.clients = clients;
  if (status !== undefined) patch.status = status;
  if (kpi_result !== undefined) patch.kpi_result = kpi_result;
  if (status === "completed") patch.completed_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("actions")
    .update(patch)
    .eq("id", actionId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ action: data });
}
