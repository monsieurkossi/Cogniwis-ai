"use client";

import { useState } from "react";
import { OniAvatar } from "./OniAvatar";

export function OniFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 group flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-pill bg-surface-1 border border-gray-200 shadow-card hover:shadow-lg hover:pr-4 transition-all"
        aria-label="Parler à Oni"
      >
        <div className="relative">
          <OniAvatar size={36} />
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-status-solid border-2 border-surface-1" />
        </div>
        <span className="hidden group-hover:inline text-sm font-semibold text-gray-900 whitespace-nowrap">
          Parle à Oni
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/30"
          onClick={() => setOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-full max-w-md bg-surface border-l border-gray-200 shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <OniAvatar size={32} />
                <div>
                  <div className="font-semibold text-gray-900">Oni</div>
                  <div className="text-xs text-status-solid">Disponible</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-card hover:bg-surface-2 text-gray-500"
                aria-label="Fermer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-6 text-center text-sm text-gray-500">
              Une question rapide ? Ouvre la conversation dans l&apos;écran principal.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
