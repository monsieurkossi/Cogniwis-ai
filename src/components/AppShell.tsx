"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { CogniwisLogo } from "./CogniwisLogo";

interface Props {
  children: React.ReactNode;
  right?: React.ReactNode;
  userEmail?: string | null;
  onSignOut?: () => void;
}

const NAV = [
  {
    href: "/chat",
    label: "Chat",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    href: "/diagnostic",
    label: "Diagnostic",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    href: "/action",
    label: "Action",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
];

export function AppShell({ children, right, userEmail, onSignOut }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar gauche */}
      <aside
        className={`hidden md:flex shrink-0 flex-col border-r border-gray-200 bg-white/70 backdrop-blur transition-[width] duration-200 ${
          collapsed ? "w-[68px]" : "w-[240px]"
        }`}
      >
        {/* Brand */}
        <div className={`flex items-center gap-2.5 px-4 h-16 ${collapsed ? "justify-center px-2" : ""}`}>
          <Link href="/" className="flex items-center gap-2.5 group">
            <CogniwisLogo size={30} />
            {!collapsed && (
              <span className="font-semibold text-gray-900 tracking-tight">
                Cogniwis
              </span>
            )}
          </Link>
        </div>

        {/* CTA nouvelle session */}
        <div className={`px-3 ${collapsed ? "px-2" : ""}`}>
          <button
            type="button"
            onClick={() => {
              if (pathname === "/chat") {
                if (typeof window !== "undefined") window.location.reload();
              } else {
                router.push("/chat");
              }
            }}
            className={`w-full inline-flex items-center gap-2 rounded-pill bg-gray-900 hover:bg-black text-white text-sm font-medium shadow-card transition-all ${
              collapsed ? "justify-center h-10 w-10 mx-auto" : "justify-center px-4 h-10"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            {!collapsed && <span>Nouvelle session</span>}
          </button>
        </div>

        {/* Nav */}
        <nav className={`mt-5 flex-1 px-2 space-y-0.5 ${collapsed ? "px-2" : "px-3"}`}>
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-card text-sm font-medium transition-colors ${
                  collapsed ? "justify-center h-10 w-10 mx-auto" : "px-3 h-10"
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
        </nav>

        {/* Footer sidebar */}
        <div className={`mt-auto p-3 border-t border-gray-100 space-y-2 ${collapsed ? "px-2" : ""}`}>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className={`w-full inline-flex items-center gap-2 rounded-card text-xs text-gray-500 hover:bg-surface-2 hover:text-gray-800 transition-colors ${
              collapsed ? "justify-center h-9 w-9 mx-auto" : "justify-start px-3 h-9"
            }`}
            aria-label={collapsed ? "Déplier la barre" : "Replier la barre"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={collapsed ? "" : "rotate-180"}>
              <path d="m9 18 6-6-6-6" />
            </svg>
            {!collapsed && <span>Replier</span>}
          </button>

          {userEmail ? (
            <div
              className={`flex items-center gap-2 rounded-card ${
                collapsed ? "justify-center p-1.5" : "px-2 py-2"
              }`}
            >
              <span className="h-7 w-7 rounded-full bg-accent text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                {(userEmail[0] || "?").toUpperCase()}
              </span>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium text-gray-900 truncate">
                    {userEmail}
                  </div>
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="text-[11px] text-gray-500 hover:text-gray-800"
                  >
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth/login"
              className={`w-full inline-flex items-center gap-2 rounded-card border border-gray-200 text-xs font-medium text-gray-700 hover:bg-surface-2 transition-colors ${
                collapsed ? "justify-center h-9 w-9 mx-auto" : "justify-center px-3 h-9"
              }`}
              title={collapsed ? "Se connecter" : undefined}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" x2="3" y1="12" y2="12" />
              </svg>
              {!collapsed && <span>Se connecter</span>}
            </Link>
          )}
        </div>
      </aside>

      {/* Zone principale */}
      <div className="flex-1 min-w-0 flex">
        <main className="flex-1 min-w-0">{children}</main>
        {right && (
          <aside className="hidden xl:block w-[300px] shrink-0 border-l border-gray-200 bg-white/40 backdrop-blur">
            <div className="h-full overflow-y-auto p-5">{right}</div>
          </aside>
        )}
      </div>
    </div>
  );
}
