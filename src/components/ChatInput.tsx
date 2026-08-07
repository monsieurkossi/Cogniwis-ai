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
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Dis-moi ce qui te préoccupe…",
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

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="glass-input rounded-[22px] px-4 pt-3.5 pb-2.5">
      <textarea
        ref={textareaRef}
        value={displayValue}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={voice?.isListening ? "Je t'écoute…" : placeholder}
        disabled={disabled || voice?.isListening}
        rows={1}
        className="w-full resize-none bg-transparent px-1 py-1 text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none max-h-52 leading-relaxed"
      />
      <div className="mt-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-gray-400">
          <button
            type="button"
            aria-label="Joindre un fichier"
            title="Joindre un fichier"
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:text-gray-700 hover:bg-surface-2 transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.98 8.83l-8.58 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          {voice && (
            <button
              type="button"
              onClick={voice.onToggle}
              disabled={disabled}
              aria-label={voice.isListening ? "Arrêter le micro" : "Activer le micro"}
              title={voice.isListening ? "Arrêter" : "Micro"}
              className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                voice.isListening
                  ? "bg-red-500 text-white animate-pulse"
                  : "hover:text-gray-700 hover:bg-surface-2"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {voice.isListening ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="1.5" />
                </svg>
              ) : (
                <MicIcon />
              )}
            </button>
          )}
          {!voice && (
            <button
              type="button"
              aria-label="Micro"
              title="Micro"
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:text-gray-700 hover:bg-surface-2 transition-colors"
            >
              <MicIcon />
            </button>
          )}
        </div>
        <button
          onClick={submit}
          disabled={!canSend}
          className="send-onyx shrink-0 h-9 w-9 rounded-xl flex items-center justify-center text-white"
          aria-label="Envoyer"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5" />
            <path d="m5 12 7-7 7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}
