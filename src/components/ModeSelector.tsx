"use client";

import type { InteractionMode } from "@/lib/types";

interface Props {
  mode: InteractionMode;
  onChange: (mode: InteractionMode) => void;
}

const MODES: {
  id: InteractionMode;
  label: string;
  hint: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "voice",
    label: "Parler",
    hint: "Je te parle, tu m'écoutes",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </svg>
    ),
  },
  {
    id: "mixed",
    label: "Mixte",
    hint: "Voix ou texte, comme tu veux",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 13V7a4 4 0 0 1 8 0v6" />
        <path d="M20 13a8 8 0 0 1-16 0" />
      </svg>
    ),
  },
  {
    id: "text",
    label: "Écrire",
    hint: "On tape, tranquille",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      </svg>
    ),
  },
];

export function ModeSelector({ mode, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {MODES.map((m) => {
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={`flex flex-col items-center gap-2 px-4 py-4 rounded-card border transition-all text-left ${
              active
                ? "bg-accent-light border-accent text-accent-dark shadow-card"
                : "bg-surface-1 border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-surface-2"
            }`}
          >
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center ${
                active ? "bg-accent text-white" : "bg-surface-2 text-gray-500"
              }`}
            >
              {m.icon}
            </div>
            <div className="font-semibold text-sm">{m.label}</div>
            <div className="text-xs text-gray-500 text-center leading-tight">
              {m.hint}
            </div>
          </button>
        );
      })}
    </div>
  );
}
