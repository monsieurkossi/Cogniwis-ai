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
  /** Look proéminent (welcome ou input de conversation), avec barre d'outils sous le champ. */
  hero?: boolean;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Dis-moi ce qui te préoccupe...",
  voice,
  value: valueProp,
  onValueChange,
  hero = false,
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
    el.style.height = Math.min(el.scrollHeight, hero ? 200 : 160) + "px";
  }, [value, hero]);

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

  if (hero) {
    return (
      <div className="chat-input-3d px-4 pt-3.5 pb-2.5 sm:px-5 sm:pt-4 sm:pb-3">
        <textarea
          ref={textareaRef}
          value={displayValue}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={voice?.isListening ? "Je t'écoute…" : placeholder}
          disabled={disabled || voice?.isListening}
          rows={1}
          className="w-full resize-none bg-transparent px-1 py-1 text-[15px] sm:text-base text-gray-900 placeholder:text-gray-400 focus:outline-none max-h-52 leading-relaxed"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <ToolIcon label="Joindre un fichier">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.98 8.83l-8.58 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </ToolIcon>
            <ToolIcon label="Rechercher sur le web">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </ToolIcon>
            <ToolIcon label="Suggestions">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18h6" />
                <path d="M10 22h4" />
                <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
              </svg>
            </ToolIcon>
            <ToolIcon label="Plus d'options">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </ToolIcon>
            {voice && (
              <ToolIcon
                label={voice.isListening ? "Arrêter le micro" : "Activer le micro"}
                onClick={voice.onToggle}
                active={voice.isListening}
                disabled={disabled}
              >
                {voice.isListening ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="1.5" />
                  </svg>
                ) : (
                  <MicIcon />
                )}
              </ToolIcon>
            )}
          </div>
          <button
            onClick={submit}
            disabled={disabled || !value.trim()}
            className="send-btn-3d shrink-0 h-10 w-10 rounded-full text-white flex items-center justify-center disabled:cursor-not-allowed"
            aria-label="Envoyer"
          >
            <svg
              width="16"
              height="16"
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
      </div>
    );
  }

  return (
    <div className="chat-input-3d flex items-end gap-2 p-2">
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
          className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
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
            <MicIcon />
          )}
        </button>
      )}
      <button
        onClick={submit}
        disabled={disabled || !value.trim()}
        className="send-btn-3d shrink-0 h-10 w-10 rounded-full text-white flex items-center justify-center disabled:cursor-not-allowed"
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

function ToolIcon({
  children,
  label,
  onClick,
  active = false,
  disabled = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`h-9 w-9 rounded-full flex items-center justify-center border transition-all ${
        active
          ? "bg-red-500 text-white border-red-500 animate-pulse"
          : "border-gray-200 text-gray-500 bg-white hover:text-gray-800 hover:border-gray-300 hover:bg-surface-1"
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function MicIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}
