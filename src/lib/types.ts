export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  timestamp?: string;
}

export type InteractionMode = "voice" | "mixed" | "text";
export type OniGender = "il" | "elle";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  activity: string | null;
  activity_duration: string | null;
  declared_objective: string | null;
  real_objective: string | null;
  archetype: string | null;
  oni_gender: OniGender;
  interaction_mode: InteractionMode;
  created_at: string;
  updated_at: string;
}

export type ConversationStatus = "active" | "completed" | "diagnostic_ready";

export interface Conversation {
  id: string;
  user_id: string;
  messages: ChatMessage[];
  status: ConversationStatus;
  recap: string | null;
  created_at: string;
  updated_at: string;
}

export type PillarStatus = "critique" | "fragile" | "solide";

export type PillarName =
  | "Positionnement"
  | "Offre"
  | "Acquisition"
  | "Conversion"
  | "Branding"
  | "Rétention"
  | "Ressources";

export interface PillarAction {
  step: number;
  title: string;
  description: string;
  deliverable: string;
  estimated_time: string;
  kpi: string;
}

export interface Pillar {
  name: PillarName;
  score: number;
  status: PillarStatus;
  priority_score: number;
  diagnosis: string;
  actions: PillarAction[];
}

export interface DiagnosticPayload {
  verdict: string;
  reframing: string | null;
  reasoning: string;
  global_score: number;
  pillars: Pillar[];
  priority_pillar: PillarName;
  active_rules: string[];
  declared_objective: string;
  real_objective: string;
}

export interface Diagnostic extends DiagnosticPayload {
  id: string;
  user_id: string;
  conversation_id: string;
  cycle_number: number;
  created_at: string;
}

export type ActionStatus = "pending" | "active" | "completed" | "skipped";
export type ClientStatus = "pending" | "ready" | "sent" | "answered";

export interface ClientTouch {
  name: string;
  role?: string;
  amount?: string;
  channel: string;
  message: string;
  status: ClientStatus;
  response_text?: string;
}

export interface Action {
  id: string;
  user_id: string;
  diagnostic_id: string;
  pillar: PillarName;
  step_number: number;
  total_steps: number;
  title: string;
  description: string | null;
  deliverable: string | null;
  estimated_time: string | null;
  kpi_target: string | null;
  kpi_result: string | null;
  status: ActionStatus;
  clients: ClientTouch[] | null;
  created_at: string;
  completed_at: string | null;
  // Injecté depuis diagnostic.reasoning en transit, pas persisté sur actions.
  diagnostic_reasoning?: string | null;
}

export interface ActionPayload {
  pillar: PillarName;
  step_number: number;
  total_steps: number;
  title: string;
  description: string;
  deliverable: string;
  estimated_time: string;
  kpi_target: string;
  clients: ClientTouch[];
}

export const PILLAR_NAMES: PillarName[] = [
  "Positionnement",
  "Offre",
  "Acquisition",
  "Conversion",
  "Branding",
  "Rétention",
  "Ressources",
];

export function statusFromScore(score: number): PillarStatus {
  if (score <= 29) return "critique";
  if (score <= 55) return "fragile";
  return "solide";
}
