import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropic() {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }
  return client;
}

// Default model for Oni — Sonnet 5 gives us the best mix of tone quality and cost.
export const ONI_MODEL = "claude-sonnet-5";
