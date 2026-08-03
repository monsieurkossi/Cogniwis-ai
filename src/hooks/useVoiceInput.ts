"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseVoiceInputReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interim: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function useVoiceInput(lang = "fr-FR"): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;

    setIsSupported(true);
    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: unknown) => {
      const evt = event as {
        resultIndex: number;
        results: {
          length: number;
          [i: number]: {
            isFinal: boolean;
            [j: number]: { transcript: string };
          };
        };
      };
      let finalChunk = "";
      let interimChunk = "";
      for (let i = evt.resultIndex; i < evt.results.length; i++) {
        const result = evt.results[i];
        const text = result[0].transcript;
        if (result.isFinal) finalChunk += text;
        else interimChunk += text;
      }
      if (finalChunk) {
        setTranscript((prev) => (prev + " " + finalChunk).trim());
      }
      setInterim(interimChunk);
    };

    recognition.onerror = (event: unknown) => {
      const err = event as { error?: string };
      console.error("[useVoiceInput] error:", err.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterim("");
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {}
      recognitionRef.current = null;
    };
  }, [lang]);

  const startListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec || isListening) return;
    setTranscript("");
    setInterim("");
    try {
      rec.start();
      setIsListening(true);
    } catch (err) {
      console.error("[useVoiceInput] start failed:", err);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec || !isListening) return;
    try {
      rec.stop();
    } catch {}
    setIsListening(false);
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterim("");
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    interim,
    startListening,
    stopListening,
    resetTranscript,
  };
}
