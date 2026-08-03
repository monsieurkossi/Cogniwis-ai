"use client";

import { useState, KeyboardEvent, useRef, useEffect } from "react";

interface VoiceProps {
  isListening: boolean;
  onToggle: () => void;
  liveTranscript?: string;
}

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Mode mixte : micro à côté de l'input. */
  voice?: VoiceProps;
  /** Contrôle le champ depuis l'extérieur (pour injecter le transcript vocal). */
  value?: string;
  onValueChange?: (v: string) => void;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Dis-moi ce qui te préoccupe...",
  voice,
  value: valueProp,
  onValueChange,
}: Props) {
  const [internal, setInternal] = useState("");
  const controlled = valueProp !== undefined;
  const value = controlled ? valueProp : internal;
  const setValue = (next: string) => {
    if (controlled) onValueChange?.(next);
    else setInternal(next);
  };
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [value]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const displayValue =
    voice?.isListening && voice.liveTranscript
      ? (value ? value + " " : "") + voice.liveTranscript
      : value;

  return (
    <div className="flex items-end gap-2 bg-surface-1 border border-gray-200 rounded-card shadow-card p-2">
      <textarea
        ref={textareaRef}
        value={displayValue}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={voice?.isListening ? "Je t'écoute…" : placeholder}
        disabled={disabled || voice?.isListening}
        rows={1}
        className="flex-1 resize-none bg-transparent px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none max-h-40"
      />
      {voice && (
        <button
          type="button"
          onClick={voice.onToggle}
          disabled={disabled}
          className={`shrink-0 h-10 w-10 rounded-card flex items-center justify-center transition-colors ${
            voice.isListening
              ? "bg-red-500 text-white animate-pulse"
              : "bg-surface-2 text-gray-600 hover:bg-gray-200"
          } disabled:bg-gray-200 disabled:cursor-not-allowed`}
          aria-label={voice.isListening ? "Arrêter le micro" : "Activer le micro"}
        >
          {voice.isListening ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="1.5" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          )}
        </button>
      )}
      <button
        onClick={submit}
        disabled={disabled || !value.trim()}
        className="shrink-0 h-10 w-10 rounded-card bg-accent hover:bg-accent-dark disabled:bg-gray-200 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
        aria-label="Envoyer"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 19V5" />
          <path d="m5 12 7-7 7 7" />
        </svg>
      </button>
    </div>
  );
}
