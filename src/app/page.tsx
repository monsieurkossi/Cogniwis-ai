import Link from "next/link";
import { redirect } from "next/navigation";
import { OniAvatar } from "@/components/OniAvatar";
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
      // Une action non terminée pour ce diagnostic ? On file droit dessus.
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

    // Sinon reprendre une conversation en cours si elle existe.
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
    <div className="min-h-[calc(100vh-3.5rem)] bg-surface flex items-center">
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="flex justify-center">
          <OniAvatar size={140} />
        </div>
        <h1 className="mt-8 text-3xl sm:text-5xl font-semibold tracking-tight text-gray-900">
          Ton <span className="text-accent">Strategic Decision OS</span>.
        </h1>
        <p className="mt-4 text-lg text-gray-600 max-w-xl mx-auto">
          Cogniwis t&apos;aide à sortir du doute stratégique. Une conversation
          avec Oni, un diagnostic clair, une première action guidée.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-card bg-accent text-white font-semibold hover:bg-accent-dark transition-colors"
          >
            Commencer avec Oni
            <span aria-hidden>→</span>
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-card border border-gray-200 text-gray-700 font-semibold hover:bg-surface-2 transition-colors"
          >
            Se connecter
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          {[
            {
              step: "1",
              title: "Conversation",
              body:
                "Oni te pose 5 à 8 questions ciblées. Pas un formulaire. Une vraie discussion.",
            },
            {
              step: "2",
              title: "Diagnostic",
              body:
                "7 piliers évalués, un score, un pilier prioritaire. Zéro jargon.",
            },
            {
              step: "3",
              title: "Action",
              body:
                "Une seule action à lancer aujourd'hui. Avec le livrable prêt à copier.",
            },
          ].map((c) => (
            <div
              key={c.step}
              className="bg-surface-1 border border-gray-200 rounded-card p-4 shadow-card"
            >
              <div className="text-xs font-semibold text-accent">
                Étape {c.step}
              </div>
              <div className="font-semibold text-gray-900 mt-1">{c.title}</div>
              <div className="text-sm text-gray-600 mt-1">{c.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
