"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CogniwisLogo } from "./CogniwisLogo";

interface Props {
  userEmail?: string | null;
}

export function Navbar({ userEmail }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const links = [
    { href: "/chat", label: "Chat" },
    { href: "/diagnostic", label: "Diagnostic" },
    { href: "/action", label: "Action" },
  ];

  return (
    <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <CogniwisLogo size={28} />
          <span className="font-semibold text-gray-900 tracking-tight">
            Cogniwis
          </span>
        </Link>
        <nav className="hidden sm:flex items-center gap-1">
          {links.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-card text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent text-white"
                    : "text-gray-600 hover:bg-surface-2"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          {userEmail ? (
            <>
              <span className="hidden sm:inline text-xs text-gray-500 truncate max-w-[160px]">
                {userEmail}
              </span>
              <button
                type="button"
                onClick={signOut}
                className="text-xs font-medium px-3 py-1.5 rounded-card border border-gray-200 text-gray-700 hover:bg-surface-2 transition-colors"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="text-xs font-medium px-3 py-1.5 rounded-card border border-gray-200 text-gray-700 hover:bg-surface-2 transition-colors"
            >
              Se connecter
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
