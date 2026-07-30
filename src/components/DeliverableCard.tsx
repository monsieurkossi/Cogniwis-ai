"use client";

import { useState } from "react";

interface Props {
  title?: string;
  content: string;
}

export function DeliverableCard({
  title = "Livrable Oni",
  content,
}: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — silently ignore
    }
  };

  return (
    <div className="bg-accent-light/40 border border-accent/20 rounded-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-wide text-accent-dark font-semibold">
          {title}
        </div>
        <button
          type="button"
          onClick={copy}
          className="text-xs font-medium px-2.5 py-1 rounded-pill bg-surface-1 border border-accent/30 text-accent-dark hover:bg-accent hover:text-white transition-colors"
        >
          {copied ? "Copié ✓" : "Copier"}
        </button>
      </div>
      <div className="bg-surface-1 border border-accent/10 rounded-card p-3 whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
        {content}
      </div>
    </div>
  );
}
