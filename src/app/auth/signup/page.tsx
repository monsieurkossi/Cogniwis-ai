"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { OniAvatar } from "@/components/OniAvatar";
import type { ChatMessage } from "@/lib/types";

function SignupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirectTo") ?? "/diagnostic";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || null },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Compte créé mais session manquante. Vérifie ton email puis connecte-toi.");
      setLoading(false);
      return;
    }

    // Create profile row
    await supabase.from("profiles").upsert({
      id: data.user.id,
      email: data.user.email!,
      full_name: fullName || null,
    });

    // Migrate any pre-signup conversation stored locally
    try {
      const raw = localStorage.getItem("cogniwis:pending-conversation");
      if (raw) {
        const parsed = JSON.parse(raw) as {
          messages: ChatMessage[];
          recap: string | null;
        };
        await supabase.from("conversations").insert({
          user_id: data.user.id,
          messages: parsed.messages,
          recap: parsed.recap,
          status: parsed.recap ? "diagnostic_ready" : "active",
        });
        localStorage.removeItem("cogniwis:pending-conversation");
      }
    } catch {
      // best-effort — carry on to redirect even if migration fails
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
            Créer ton compte
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Ta conversation avec Oni est sauvegardée. On la reprend juste après.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="bg-surface-1 border border-gray-200 rounded-card shadow-card p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prénom (optionnel)
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 rounded-card border border-gray-200 bg-surface-1 focus:outline-none focus:border-accent"
              placeholder="Alex"
            />
          </div>

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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-card border border-gray-200 bg-surface-1 focus:outline-none focus:border-accent"
              placeholder="8 caractères min."
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
            {loading ? "Création…" : "Créer mon compte"}
          </button>

          <div className="text-center text-sm text-gray-500">
            Déjà un compte ?{" "}
            <Link href="/auth/login" className="text-accent-dark font-semibold hover:underline">
              Se connecter
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupInner />
    </Suspense>
  );
}
