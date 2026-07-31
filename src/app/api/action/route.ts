import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, ONI_MODEL } from "@/lib/anthropic";
import { ONI_SYSTEM_PROMPT, ACTION_INSTRUCTION } from "@/lib/prompts/oni-system";
import type { ActionPayload, DiagnosticPayload } from "@/lib/types";

export const runtime = "nodejs";

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) return fence[1].trim();
  return trimmed;
}

interface ActionRequestBody {
  diagnosticId?: string;
  diagnostic?: DiagnosticPayload;
}

async function generateAction(
  diagnostic: Pick<
    DiagnosticPayload,
    "verdict" | "reframing" | "reasoning" | "global_score" | "priority_pillar" | "pillars"
  >
): Promise<{ payload: ActionPayload } | { error: string; raw?: string; status: number }> {
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
            diagnostic,
            null,
            2
          )}\n\n${ACTION_INSTRUCTION}`,
        },
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "erreur Anthropic";
    return { error: message, status: 500 };
  }

  const textBlock = response.content.find((c) => c.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
  try {
    return { payload: JSON.parse(stripJsonFences(raw)) as ActionPayload };
  } catch {
    return { error: "Réponse Oni non parsable en JSON", raw, status: 502 };
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as ActionRequestBody;

  // Mode anonyme : diagnostic direct
  if (body.diagnostic) {
    const result = await generateAction(body.diagnostic);
    if ("error" in result) {
      return Response.json(
        { error: result.error, raw: result.raw },
        { status: result.status }
      );
    }
    const p = result.payload;
    return Response.json({
      action: {
        id: `anon-action-${Date.now()}`,
        user_id: null,
        diagnostic_id: null,
        pillar: p.pillar,
        step_number: p.step_number,
        total_steps: p.total_steps,
        title: p.title,
        description: p.description,
        deliverable: p.deliverable,
        estimated_time: p.estimated_time,
        kpi_target: p.kpi_target,
        kpi_result: null,
        status: "active",
        clients: p.clients ?? [],
        created_at: new Date().toISOString(),
        completed_at: null,
      },
      reused: false,
      anonymous: true,
    });
  }

  const diagnosticId = body.diagnosticId;
  if (!diagnosticId) {
    return Response.json({ error: "diagnosticId ou diagnostic requis" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

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

  const result = await generateAction({
    verdict: diag.verdict,
    reframing: diag.reframing,
    reasoning: diag.reasoning,
    global_score: diag.global_score,
    priority_pillar: diag.priority_pillar,
    pillars: diag.pillars,
  });
  if ("error" in result) {
    return Response.json(
      { error: result.error, raw: result.raw },
      { status: result.status }
    );
  }
  const payload = result.payload;

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

  // Actions anonymes : rien à persister, on renvoie 204
  if (actionId.startsWith("anon-")) {
    return Response.json({ action: null, anonymous: true });
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
