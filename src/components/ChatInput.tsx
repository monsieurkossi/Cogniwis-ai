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
  voice?: VoiceProps;
  value?: string;
  onValueChange?: (v: string) => void;
  /** Look accent (bord bleu + ombre) pour l'accueil, sinon standard. */
  emphasized?: boolean;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Dis-moi ce qui te préoccupe…",
  voice,
  value: valueProp,
  onValueChange,
  emphasized = false,
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
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
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

  const shellClass = emphasized
    ? "bg-white border-[1.5px] border-accent shadow-[0_0_0_3px_rgba(12,0,255,0.06),0_10px_28px_-10px_rgba(12,0,255,0.15)]"
    : "bg-white border border-gray-200 shadow-card focus-within:border-accent/60 focus-within:shadow-[0_0_0_3px_rgba(12,0,255,0.06)]";

  return (
    <div className={`${shellClass} rounded-[18px] px-3.5 pt-3 pb-2.5 transition-all`}>
      <textarea
        ref={textareaRef}
        value={displayValue}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={voice?.isListening ? "Je t'écoute…" : placeholder}
        disabled={disabled || voice?.isListening}
        rows={1}
        className="w-full resize-none bg-transparent px-1 py-0.5 text-[14px] sm:text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none max-h-52 leading-relaxed"
      />
      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-0.5 text-gray-500 flex-wrap">
          <ToolPill label="Joindre">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.98 8.83l-8.58 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
            <span className="hidden sm:inline">Joindre</span>
          </ToolPill>
          <span className="text-gray-200">|</span>
          {voice ? (
            <button
              type="button"
              onClick={voice.onToggle}
              disabled={disabled}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11.5px] transition-colors ${
                voice.isListening
                  ? "bg-red-500 text-white animate-pulse"
                  : "text-gray-500 hover:text-gray-900 hover:bg-surface-2"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              aria-label={voice.isListening ? "Arrêter le micro" : "Activer le micro"}
            >
              {voice.isListening ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="1.5" />
                </svg>
              ) : (
                <MicIcon />
              )}
              <span className="hidden sm:inline">Vocal</span>
            </button>
          ) : (
            <ToolPill label="Vocal">
              <MicIcon />
              <span className="hidden sm:inline">Vocal</span>
            </ToolPill>
          )}
          <span className="text-gray-200">|</span>
          <ToolPill label="Prompts">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6" />
              <path d="M10 22h4" />
              <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
            </svg>
            <span className="hidden sm:inline">Prompts</span>
          </ToolPill>
        </div>
        <button
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="shrink-0 h-8 w-8 rounded-lg bg-gray-900 hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
          aria-label="Envoyer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5" />
            <path d="m5 12 7-7 7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ToolPill({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11.5px] text-gray-500 hover:text-gray-900 hover:bg-surface-2 transition-colors"
    >
      {children}
    </button>
  );
}

function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}
