"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { OniAvatar } from "@/components/OniAvatar";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirectTo") ?? "/diagnostic";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-surface">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <OniAvatar size={64} />
          <h1 className="mt-4 text-2xl font-semibold text-gray-900">
            Bon retour parmi nous
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Reconnecte-toi pour reprendre là où tu en étais.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="bg-surface-1 border border-gray-200 rounded-card shadow-card p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-card border border-gray-200 bg-surface-1 focus:outline-none focus:border-accent"
              placeholder="toi@exemple.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-card border border-gray-200 bg-surface-1 focus:outline-none focus:border-accent"
            />
          </div>

          {error && (
            <div className="text-sm text-status-critical bg-status-critical-bg border border-status-critical/30 rounded-card p-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-card bg-accent text-white font-semibold hover:bg-accent-dark disabled:opacity-60 transition-colors"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>

          <div className="text-center text-sm text-gray-500">
            Pas encore de compte ?{" "}
            <Link href="/auth/signup" className="text-accent-dark font-semibold hover:underline">
              Créer un compte
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
