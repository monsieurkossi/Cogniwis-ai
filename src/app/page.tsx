import Link from "next/link";
import { redirect } from "next/navigation";
import { OniAvatar } from "@/components/OniAvatar";
import { PersonaAvatar } from "@/components/PersonaAvatar";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: diag } = await supabase
      .from("diagnostics")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (diag) {
      const { data: activeAction } = await supabase
        .from("actions")
        .select("id")
        .eq("diagnostic_id", diag.id)
        .in("status", ["pending", "active"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeAction) redirect(`/action?diagnostic=${diag.id}`);
      redirect(`/diagnostic?id=${diag.id}`);
    }

    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (conv) redirect(`/chat?conversation=${conv.id}`);
    redirect("/chat");
  }

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden bg-surface">
      {/* Halo d'ambiance */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 40% at 50% 0%, rgba(0,34,255,0.10), transparent 70%), radial-gradient(40% 30% at 90% 20%, rgba(95,125,255,0.10), transparent 70%)",
        }}
      />

      <div className="max-w-5xl mx-auto px-6 pt-14 pb-24 sm:pt-20">
        {/* Chip d'intro */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-surface-1 border border-gray-200 text-xs font-medium text-gray-600 shadow-card">
            <span className="h-1.5 w-1.5 rounded-full bg-status-solid" />
            Strategic Decision OS · MVP disponible
          </span>
        </div>

        {/* Orb Oni */}
        <div className="mt-10 flex justify-center">
          <OniAvatar size={132} />
        </div>

        {/* Hero */}
        <h1 className="mt-10 text-center text-4xl sm:text-6xl font-semibold tracking-tight text-gray-900 leading-[1.05]">
          Pense clair.
          <br />
          <span className="text-gray-400">Décide juste.</span>
        </h1>
        <p className="mt-6 text-center text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
          Cogniwis, ton conseiller stratégique. Une conversation avec Oni, un
          diagnostic honnête, une action à lancer aujourd&apos;hui — pas un
          formulaire de plus.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/chat"
            className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-pill bg-accent text-white font-semibold text-[15px] hover:bg-accent-dark shadow-card transition-all hover:scale-[1.02]"
          >
            Commencer avec Oni
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform group-hover:translate-x-0.5"
            >
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-pill text-gray-700 font-semibold text-[15px] hover:bg-surface-2 transition-colors"
          >
            J&apos;ai déjà un compte
          </Link>
        </div>

        {/* Choix du "genre" d'Oni — teasing UX du chat */}
        <div className="mt-14 flex items-center justify-center gap-6 flex-wrap">
          <div className="flex items-center gap-3">
            <PersonaAvatar gender="il" size={56} />
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                Version « il »
              </div>
              <div className="text-sm text-gray-800">Ton, direct, franc</div>
            </div>
          </div>
          <div className="hidden sm:block h-8 w-px bg-gray-200" />
          <div className="flex items-center gap-3">
            <PersonaAvatar gender="elle" size={56} />
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                Version « elle »
              </div>
              <div className="text-sm text-gray-800">Empathique, incisive</div>
            </div>
          </div>
        </div>

        {/* Étapes — cartes aérées */}
        <div className="mt-20">
          <div className="text-center">
            <div className="text-xs uppercase tracking-[0.18em] text-gray-500 font-semibold">
              Comment ça marche
            </div>
            <h2 className="mt-3 text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">
              Trois étapes, zéro jargon.
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                step: "01",
                title: "Conversation",
                body:
                  "Oni te pose 5 à 8 questions ciblées. Pas un formulaire. Une vraie discussion.",
                icon: (
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                ),
              },
              {
                step: "02",
                title: "Diagnostic",
                body:
                  "7 piliers évalués, un score, un pilier prioritaire. Rien d'abstrait.",
                icon: (
                  <>
                    <path d="M3 3v18h18" />
                    <path d="m19 9-5 5-4-4-3 3" />
                  </>
                ),
              },
              {
                step: "03",
                title: "Action",
                body:
                  "Une seule action à lancer aujourd'hui. Avec le livrable prêt à copier.",
                icon: <path d="m5 12 5 5L20 7" />,
              },
            ].map((c) => (
              <div
                key={c.step}
                className="group relative bg-surface-1 border border-gray-200 rounded-2xl p-6 shadow-card hover:shadow-lg hover:border-accent/30 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-accent-light text-accent-dark flex items-center justify-center">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {c.icon}
                    </svg>
                  </div>
                  <div className="text-xs font-mono text-gray-400">{c.step}</div>
                </div>
                <div className="mt-5 font-semibold text-gray-900 text-lg">
                  {c.title}
                </div>
                <div className="mt-1.5 text-sm text-gray-600 leading-relaxed">
                  {c.body}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bandeau final */}
        <div className="mt-20 rounded-2xl bg-gradient-to-br from-accent to-accent-dark text-white p-8 sm:p-10 shadow-card overflow-hidden relative">
          <div
            aria-hidden
            className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"
          />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-white/70 font-semibold">
                5 minutes
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">
                Fais le point maintenant.
              </div>
              <div className="mt-2 text-white/80 max-w-md">
                Pas de carte bleue. Pas de compte à créer avant de voir la
                valeur. Tu écris, Oni écoute.
              </div>
            </div>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-pill bg-white text-accent font-semibold text-[15px] hover:bg-white/95 shadow-lg transition-transform hover:scale-[1.02] whitespace-nowrap"
            >
              Ouvrir le chat →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
