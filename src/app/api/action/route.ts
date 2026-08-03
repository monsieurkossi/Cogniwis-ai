import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, ONI_MODEL } from "@/lib/anthropic";
import {
  ONI_SYSTEM_PROMPT,
  ACTION_INSTRUCTION,
  NEXT_ACTION_INSTRUCTION,
} from "@/lib/prompts/oni-system";
import type { ActionPayload, DiagnosticPayload } from "@/lib/types";

export const runtime = "nodejs";
// Même contrainte que /api/diagnostic : Claude peut dépasser les 10s par défaut.
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

interface ActionRequestBody {
  diagnosticId?: string;
  diagnostic?: DiagnosticPayload;
  // Génération explicite de l'action suivante à partir des précédentes.
  next?: boolean;
  previousActions?: Array<
    Pick<
      ActionPayload,
      "pillar" | "step_number" | "title" | "kpi_target"
    > & { kpi_result?: string | null; status?: string | null }
  >;
  previousAnalysis?: unknown;
}

async function generateAction(
  diagnostic: Pick<
    DiagnosticPayload,
    "verdict" | "reframing" | "reasoning" | "global_score" | "priority_pillar" | "pillars"
  >,
  context?: {
    previousActions?: ActionRequestBody["previousActions"];
    previousAnalysis?: unknown;
  }
): Promise<{ payload: ActionPayload } | { error: string; raw?: string; status: number }> {
  const anthropic = getAnthropic();
  const isNext =
    !!context?.previousActions && context.previousActions.length > 0;
  const userContent = isNext
    ? `Voici le diagnostic :\n\n${JSON.stringify(diagnostic, null, 2)}\n\n` +
      `Actions déjà exécutées (par ordre chronologique) :\n${JSON.stringify(
        context.previousActions,
        null,
        2
      )}\n\n` +
      (context.previousAnalysis
        ? `Dernière analyse de verbatims :\n${JSON.stringify(
            context.previousAnalysis,
            null,
            2
          )}\n\n`
        : "") +
      NEXT_ACTION_INSTRUCTION
    : `Voici le diagnostic établi précédemment :\n\n${JSON.stringify(
        diagnostic,
        null,
        2
      )}\n\n${ACTION_INSTRUCTION}`;

  let response;
  try {
    response = await anthropic.messages.create({
      model: ONI_MODEL,
      max_tokens: 2048,
      thinking: { type: "disabled" },
      system: ONI_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "erreur Anthropic";
    return { error: message, status: 500 };
  }

  const textBlock = response.content.find((c) => c.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
  try {
    return { payload: extractJSON<ActionPayload>(raw) };
  } catch (err) {
    console.error(
      "[action] parsing JSON échoué. Réponse brute:",
      raw.substring(0, 800),
      "erreur:",
      err instanceof Error ? err.message : err
    );
    return {
      error: "action_parse_failed",
      raw: raw.substring(0, 500),
      status: 502,
    };
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as ActionRequestBody;

  // Mode anonyme : diagnostic direct
  if (body.diagnostic) {
    const result = await generateAction(body.diagnostic, {
      previousActions: body.previousActions,
      previousAnalysis: body.previousAnalysis,
    });
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
        diagnostic_reasoning: body.diagnostic.reasoning ?? null,
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

  const { data: existingRows } = await supabase
    .from("actions")
    .select("*, diagnostics(reasoning)")
    .eq("diagnostic_id", diagnosticId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const existing = existingRows ?? [];

  // Sans « next » : on renvoie la dernière action (active ou complétée) si
  // elle existe. C'est ce que la page consomme au premier chargement.
  if (!body.next && existing.length > 0) {
    const latest = existing[existing.length - 1] as {
      diagnostics?: { reasoning?: string | null } | null;
    } & Record<string, unknown>;
    const { diagnostics, ...actionRow } = latest;
    return Response.json({
      action: {
        ...actionRow,
        diagnostic_reasoning: diagnostics?.reasoning ?? null,
      },
      reused: true,
    });
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

  // Construit le contexte pour la génération d'action suivante.
  const previousActions =
    body.next && existing.length > 0
      ? existing.map((a) => {
          const row = a as Record<string, unknown>;
          return {
            pillar: row.pillar as ActionPayload["pillar"],
            step_number: row.step_number as number,
            title: row.title as string,
            kpi_target: (row.kpi_target as string | null) ?? "",
            kpi_result: (row.kpi_result as string | null) ?? null,
            status: (row.status as string | null) ?? null,
          };
        })
      : undefined;

  const previousAnalysis = (() => {
    if (!body.next || existing.length === 0) return undefined;
    const lastCompleted = [...existing]
      .reverse()
      .find(
        (a) =>
          (a as Record<string, unknown>).status === "completed" &&
          (a as Record<string, unknown>).kpi_result
      ) as Record<string, unknown> | undefined;
    if (!lastCompleted) return body.previousAnalysis;
    try {
      return JSON.parse(lastCompleted.kpi_result as string);
    } catch {
      return body.previousAnalysis;
    }
  })();

  const result = await generateAction(
    {
      verdict: diag.verdict,
      reframing: diag.reframing,
      reasoning: diag.reasoning,
      global_score: diag.global_score,
      priority_pillar: diag.priority_pillar,
      pillars: diag.pillars,
    },
    { previousActions, previousAnalysis }
  );
  if ("error" in result) {
    return Response.json(
      { error: result.error, raw: result.raw },
      { status: result.status }
    );
  }
  const payload = result.payload;

  // Force step_number = max(existing) + 1 pour éviter les doublons si Claude
  // renvoie une valeur incohérente sur une génération « next ».
  const stepNumber = body.next && existing.length > 0
    ? Math.max(
        ...existing.map(
          (a) => ((a as Record<string, unknown>).step_number as number) ?? 0
        )
      ) + 1
    : payload.step_number;

  const { data: inserted, error: insertErr } = await supabase
    .from("actions")
    .insert({
      user_id: user.id,
      diagnostic_id: diagnosticId,
      pillar: payload.pillar,
      step_number: stepNumber,
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

  return Response.json({
    action: { ...inserted, diagnostic_reasoning: diag.reasoning ?? null },
    reused: false,
  });
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
