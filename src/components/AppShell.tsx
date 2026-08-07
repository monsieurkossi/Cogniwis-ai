"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CogniwisLogo } from "./CogniwisLogo";

interface Props {
  children: React.ReactNode;
  right?: React.ReactNode;
  /** Titre affiché dans la topbar main (ex : "Chat"). */
  title?: string;
  userEmail?: string | null;
  onSignOut?: () => void;
}

const NAV_MAIN = [
  {
    href: "/chat",
    label: "Chat",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    href: "/diagnostic",
    label: "Diagnostic",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    href: "/action",
    label: "Action",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    href: "/history",
    label: "Historique",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
];

export function AppShell({
  children,
  right,
  title = "Chat",
  userEmail,
  onSignOut,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = (typeof window !== "undefined"
      ? (localStorage.getItem("cogniwis-theme") as "light" | "dark" | null)
      : null) || "light";
    setThemeState(stored);
  }, []);

  const setTheme = (t: "light" | "dark") => {
    setThemeState(t);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", t);
      try {
        localStorage.setItem("cogniwis-theme", t);
      } catch {}
    }
  };

  return (
    <div className="min-h-screen bg-surface flex">
      {/* ================= SIDEBAR GAUCHE ================= */}
      <aside
        className={`hidden md:flex shrink-0 flex-col border-r border-gray-200 bg-surface transition-[width] duration-200 ${
          collapsed ? "w-[68px]" : "w-[236px]"
        }`}
      >
        {/* Brand + collapse */}
        <div
          className={`flex items-center h-14 px-4 ${
            collapsed ? "justify-center px-2" : "justify-between"
          }`}
        >
          <Link href="/" className="flex items-center gap-2.5 group">
            <CogniwisLogo size={26} />
            {!collapsed && (
              <span className="font-bold text-gray-900 tracking-tight text-[15px]">
                Cogniwis
              </span>
            )}
          </Link>
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="text-gray-400 hover:text-gray-700 transition-colors"
              aria-label="Replier la barre latérale"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18" />
              </svg>
            </button>
          )}
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="px-3 mt-1">
            <button
              type="button"
              className="w-full flex items-center gap-2 h-9 px-3 rounded-lg bg-white border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <span className="text-[12.5px] text-gray-400 flex-1 text-left">
                Rechercher
              </span>
              <span className="text-[10px] text-gray-400 bg-surface-2 px-1.5 py-0.5 rounded font-mono">
                ⌘K
              </span>
            </button>
          </div>
        )}

        {/* Nav principale */}
        <nav className={`mt-3 px-3 space-y-0.5 ${collapsed ? "px-2" : ""}`}>
          {NAV_MAIN.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                  collapsed ? "justify-center h-10 w-10 mx-auto" : "px-3 h-9"
                } ${
                  active
                    ? "bg-accent-light text-accent-dark"
                    : "text-gray-600 hover:bg-surface-2"
                }`}
              >
                <span className={active ? "text-accent" : "text-gray-500"}>
                  {item.icon}
                </span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
          <div
            className={`flex items-center rounded-lg text-[13px] font-medium text-gray-600 hover:bg-surface-2 transition-colors ${
              collapsed ? "justify-center h-10 w-10 mx-auto" : "px-3 h-9 justify-between"
            }`}
            title={collapsed ? "Communauté (bientôt)" : undefined}
          >
            <span className="flex items-center gap-2.5">
              <span className="text-gray-500">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              {!collapsed && <span>Communauté</span>}
            </span>
            {!collapsed && (
              <span className="text-[9.5px] text-white bg-gradient-to-r from-accent to-[#5f7dff] px-1.5 py-0.5 rounded-md font-semibold tracking-wide">
                NEW
              </span>
            )}
          </div>
        </nav>

        {/* Réglages */}
        <div className={`mt-6 ${collapsed ? "px-2" : "px-3"}`}>
          {!collapsed && (
            <div className="px-3 mb-1 text-[10px] uppercase tracking-[0.14em] text-gray-400 font-semibold">
              Réglages
            </div>
          )}
          <div className="space-y-0.5">
            <button
              type="button"
              title={collapsed ? "Paramètres" : undefined}
              className={`w-full flex items-center gap-2.5 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-surface-2 transition-colors ${
                collapsed ? "justify-center h-10 w-10 mx-auto" : "px-3 h-9"
              }`}
            >
              <span className="text-gray-500">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </span>
              {!collapsed && <span>Paramètres</span>}
            </button>
            <button
              type="button"
              title={collapsed ? "Aide" : undefined}
              className={`w-full flex items-center gap-2.5 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-surface-2 transition-colors ${
                collapsed ? "justify-center h-10 w-10 mx-auto" : "px-3 h-9"
              }`}
            >
              <span className="text-gray-500">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" x2="12.01" y1="17" y2="17" />
                </svg>
              </span>
              {!collapsed && <span>Aide</span>}
            </button>
          </div>
        </div>

        {/* Bas : toggle Clair/Sombre + profil */}
        <div className={`mt-auto p-3 space-y-2 ${collapsed ? "px-2" : ""}`}>
          {!collapsed && (
            <div className="bg-white border border-gray-200 rounded-full p-0.5 flex text-[11px]">
              {(["light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`flex-1 text-center px-2 py-1.5 rounded-full transition-colors ${
                    theme === t
                      ? "bg-surface-2 text-gray-900 font-medium shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t === "light" ? "☀ Clair" : "☾ Sombre"}
                </button>
              ))}
            </div>
          )}

          {collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="w-9 h-9 mx-auto rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-800 hover:bg-surface-2"
              aria-label="Déplier la barre latérale"
              title="Déplier"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M15 3v18" />
              </svg>
            </button>
          ) : userEmail ? (
            <div className="flex items-center gap-2.5 px-2 py-1.5">
              <span className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-500 to-red-500 text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                {(userEmail[0] || "?").toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-semibold text-gray-900 truncate leading-tight">
                  {userEmail.split("@")[0]}
                </div>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="text-[11px] text-gray-500 hover:text-gray-800"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-2 py-1.5">
              <span className="h-7 w-7 rounded-full bg-surface-2 border border-gray-200 text-gray-500 text-[11px] flex items-center justify-center shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href="/auth/login"
                  className="text-[12px] font-semibold text-gray-900 hover:text-accent"
                >
                  Se connecter
                </Link>
                <div className="text-[10.5px] text-gray-400 leading-tight">
                  Sauvegarder ta session
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ================= COLONNE CENTRALE ================= */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar main */}
        <div className="h-14 shrink-0 border-b border-gray-200 bg-surface/90 backdrop-blur flex items-center justify-between px-5 sm:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="md:hidden text-gray-500 hover:text-gray-900"
              aria-label="Menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <span className="text-[14px] font-semibold text-gray-900">
              {title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/chat")}
              className="hidden sm:inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-white bg-gray-900 hover:bg-black px-3 py-1.5 rounded-full transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2 3 14h7v8l10-12h-7z" />
              </svg>
              Upgrade
            </button>
            <button
              type="button"
              className="h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-800 hover:bg-surface-2 transition-colors"
              aria-label="Aide"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" x2="12.01" y1="17" y2="17" />
              </svg>
            </button>
            <div className="h-8 w-8 rounded-full bg-gray-900 border-2 border-status-solid" />
          </div>
        </div>

        {/* Zone contenu + panneau droit */}
        <div className="flex-1 min-h-0 flex">
          <main className="flex-1 min-w-0">{children}</main>
          {right && (
            <aside className="hidden xl:block w-[288px] shrink-0 border-l border-gray-200 bg-white/50 backdrop-blur">
              <div className="h-full overflow-y-auto p-4">{right}</div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
