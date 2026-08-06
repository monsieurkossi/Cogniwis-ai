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
    <div className="min-h-[calc(100vh-3.5rem)] bg-surface">
      {/* ================================ HERO ================================ */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 40% at 85% 15%, rgba(0,34,255,0.12), transparent 60%)",
          }}
        />
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-pill bg-surface-1 border border-gray-200 text-[11px] font-medium text-gray-500 uppercase tracking-[0.14em]">
              <span className="text-accent">■</span> Strategic Decision OS
            </div>
            <h1 className="mt-6 text-[44px] sm:text-[68px] font-semibold tracking-tight text-gray-900 leading-[1.02]">
              Ta stratégie
              <br />
              mérite mieux
              <br />
              <span className="text-gray-400">qu&apos;un tableur.</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 max-w-lg leading-relaxed">
              Cogniwis remplace les frameworks confus par un vrai conseiller.
              Oni te pose les bonnes questions, isole ce qui bloque, et te
              donne <em className="not-italic font-semibold text-gray-900">une seule action</em> à
              lancer aujourd&apos;hui.
            </p>
            <div className="mt-8 flex items-center gap-3 flex-wrap">
              <Link
                href="/chat"
                className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-pill bg-gray-900 text-white font-semibold text-[15px] hover:bg-black shadow-card transition-all hover:scale-[1.02]"
              >
                Commencer gratuitement
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-pill text-gray-700 font-semibold text-[15px] hover:bg-surface-2 transition-colors"
              >
                Se connecter
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-5 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7" /></svg>
                Sans carte bleue
              </span>
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7" /></svg>
                5 minutes
              </span>
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7" /></svg>
                Sans jargon
              </span>
            </div>
          </div>

          {/* Aperçu produit — carte flottante montrant le résultat */}
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-8 -z-10 rounded-[32px]"
              style={{
                background:
                  "radial-gradient(60% 50% at 50% 50%, rgba(0,34,255,0.15), transparent 70%)",
              }}
            />
            <div className="rounded-2xl bg-surface-1 border border-gray-200 shadow-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <OniAvatar size={32} />
                  <div>
                    <div className="text-xs font-semibold text-gray-900">Oni</div>
                    <div className="text-[11px] text-status-solid">Diagnostic livré</div>
                  </div>
                </div>
                <div className="text-[11px] px-2 py-0.5 rounded-pill bg-status-solid-bg text-status-solid font-medium">
                  Prêt
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-surface p-4">
                <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
                  Pilier prioritaire
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <div className="text-xl font-semibold text-gray-900">Acquisition</div>
                  <div className="text-sm text-gray-500">
                    <span className="text-status-critical font-semibold">28</span>
                    <span className="text-gray-400">/100</span>
                  </div>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-status-critical to-status-fragile" style={{ width: "28%" }} />
                </div>
              </div>
              <div className="rounded-xl border border-accent/30 bg-accent-light/50 p-4">
                <div className="text-[11px] uppercase tracking-wide text-accent-dark font-semibold">
                  Ton action aujourd&apos;hui
                </div>
                <div className="mt-1 font-semibold text-gray-900">
                  Contacter 5 anciens clients avec ce message
                </div>
                <div className="mt-2 text-xs text-gray-600 leading-relaxed">
                  Livrable prêt. KPI clair. Retour dans 48h.
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-accent to-accent-dark" />
                <span>Diagnostic mis à jour il y a 2 min</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================ FEATURES ============================ */}
      <section className="border-t border-gray-200 bg-surface-1">
        <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
          <div className="text-[11px] uppercase tracking-[0.16em] text-gray-500 font-semibold flex items-center gap-2">
            <span className="text-accent">■</span> Ce que fait Cogniwis
          </div>
          <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight text-gray-900 leading-[1.05]">
            Écoute. Diagnostique. <span className="text-gray-400">Débloque.</span>
          </h2>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group relative bg-surface p-6 rounded-2xl border border-transparent hover:border-gray-200 transition-all"
              >
                <div className="h-9 w-9 rounded-lg bg-gray-900 text-white flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {f.icon}
                  </svg>
                </div>
                <div className="mt-6 font-semibold text-gray-900">{f.title}</div>
                <div className="mt-1.5 text-sm text-gray-600 leading-relaxed">{f.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================ TESTIMONIALS ======================== */}
      <section className="border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
          <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-10 items-end">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-gray-500 font-semibold flex items-center gap-2">
                <span className="text-accent">■</span> Témoignages
              </div>
              <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight text-gray-900 leading-[1.05]">
                Ceux qui ont arrêté
                <br />
                <span className="text-gray-400">de tourner en rond.</span>
              </h2>
              <p className="mt-6 text-gray-600 max-w-md leading-relaxed">
                Cogniwis est en beta privée. Voilà ce que nos premiers utilisateurs
                nous ont envoyé après leur diagnostic.
              </p>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory -mx-6 px-6">
              {TESTIMONIALS.map((t) => (
                <div
                  key={t.name}
                  className="shrink-0 w-[320px] snap-start bg-surface-1 border border-gray-200 rounded-2xl p-5 shadow-card"
                >
                  <div className="space-y-2">
                    <div className="flex justify-start">
                      <div className="max-w-[85%] bg-gray-900 text-white text-sm rounded-2xl rounded-bl-md px-3.5 py-2">
                        {t.hook}
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="max-w-[90%] bg-gray-100 text-gray-900 text-sm rounded-2xl rounded-bl-md px-3.5 py-2">
                        {t.quote}
                      </div>
                    </div>
                    {t.reply && (
                      <div className="flex justify-end">
                        <div className="max-w-[75%] bg-accent-light text-accent-dark text-sm rounded-2xl rounded-br-md px-3.5 py-2">
                          {t.reply}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-6 flex items-center gap-2.5 pt-4 border-t border-gray-100">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                      style={{ background: t.color }}
                    >
                      {t.initials}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                      <div className="text-xs text-gray-500">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================ HOW IT WORKS ======================== */}
      <section className="border-t border-gray-200 bg-surface-1">
        <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
          <div className="text-[11px] uppercase tracking-[0.16em] text-gray-500 font-semibold flex items-center gap-2">
            <span className="text-accent">■</span> Comment ça marche
          </div>
          <h2 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight text-gray-900 leading-[1.05]">
            Trois étapes. <span className="text-gray-400">Zéro formulaire.</span>
          </h2>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-px bg-gray-200 rounded-2xl overflow-hidden border border-gray-200">
            {STEPS.map((s, i) => (
              <div key={s.title} className="bg-surface-1 p-8">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs text-gray-400">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="h-1.5 w-16 rounded-full bg-gradient-to-r from-accent to-accent-dark" style={{ opacity: 0.3 + i * 0.35 }} />
                </div>
                <div className="mt-8 font-semibold text-lg text-gray-900">{s.title}</div>
                <div className="mt-2 text-sm text-gray-600 leading-relaxed">{s.body}</div>
                <div className="mt-6 text-xs text-gray-500">{s.time}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================ CTA ================================= */}
      <section className="border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-24 sm:py-32">
          <div className="relative rounded-3xl bg-gray-900 text-white p-10 sm:p-14 overflow-hidden">
            <div
              aria-hidden
              className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-accent/40 blur-3xl"
            />
            <div
              aria-hidden
              className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-accent-dark/50 blur-3xl"
            />
            <div className="relative grid lg:grid-cols-[1.3fr_0.7fr] gap-8 items-center">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-white/60 font-semibold">
                  Prêt à trancher ?
                </div>
                <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.05]">
                  5 minutes. Une décision claire.
                </h2>
                <p className="mt-5 text-white/70 max-w-lg leading-relaxed">
                  Tu écris, Oni écoute. Il te renvoie un diagnostic complet et
                  une action précise à lancer aujourd&apos;hui. Sans engagement,
                  sans compte à créer.
                </p>
              </div>
              <div className="flex lg:justify-end">
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-pill bg-white text-gray-900 font-semibold text-[15px] hover:bg-white/95 shadow-lg transition-transform hover:scale-[1.02]"
                >
                  Ouvrir le chat
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const FEATURES = [
  {
    title: "Vraie conversation",
    body: "5 à 8 questions ciblées avec Oni. Voix ou texte. Pas un formulaire déguisé en chat.",
    icon: (
      <>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </>
    ),
  },
  {
    title: "Diagnostic honnête",
    body: "7 piliers évalués sur 100, un score global, un pilier prioritaire. Zéro langue de bois.",
    icon: (
      <>
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </>
    ),
  },
  {
    title: "Une seule action",
    body: "Pas dix chantiers. Une action à lancer aujourd'hui, avec le livrable prêt à copier.",
    icon: <path d="m5 12 5 5L20 7" />,
  },
  {
    title: "Verbatims analysés",
    body: "Colle les réponses de tes clients, Oni détecte les patterns et te sort l'angle qui converge.",
    icon: (
      <>
        <path d="M14 9V5a3 3 0 0 0-6 0v4" />
        <rect x="2" y="9" width="20" height="12" rx="2" />
      </>
    ),
  },
  {
    title: "Mémoire persistante",
    body: "Tu reviens dans une semaine, Oni reprend là où on s'est arrêté. Pas de recommencement.",
    icon: (
      <>
        <path d="M12 3v18" />
        <path d="M3 12h18" />
        <circle cx="12" cy="12" r="9" />
      </>
    ),
  },
  {
    title: "Ton conseiller privé",
    body: "Un bouton flottant, partout. Un doute, une question — Oni te répond en contexte, sans quitter ta page.",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </>
    ),
  },
];

const STEPS = [
  {
    title: "Conversation",
    body: "Oni te pose 5 à 8 questions ciblées. Voix ou texte. Il retient ce qui compte, ignore le reste.",
    time: "≈ 3 min",
  },
  {
    title: "Diagnostic",
    body: "Tes 7 piliers évalués, un score, un recadrage si besoin. Tu comprends enfin où tu es.",
    time: "≈ 30 sec",
  },
  {
    title: "Action",
    body: "Une seule action, un livrable à copier, un KPI clair. Tu envoies, tu récoltes les verbatims, on ajuste.",
    time: "Dès aujourd'hui",
  },
];

const TESTIMONIALS = [
  {
    name: "Léa M.",
    role: "Consultante indépendante",
    initials: "LM",
    color: "linear-gradient(135deg,#0022ff,#5f7dff)",
    hook: "Franchement bluffée.",
    quote:
      "J'ai passé 6 mois à collecter des frameworks. En 5 minutes Oni m'a sorti l'action que j'évitais.",
    reply: "C'était le point de blocage",
  },
  {
    name: "Karim B.",
    role: "Freelance dev",
    initials: "KB",
    color: "linear-gradient(135deg,#111827,#374151)",
    hook: "Pas un chatbot de plus.",
    quote:
      "Le diagnostic m'a dit ce que mes proches n'osaient pas. Direct, précis, actionnable.",
  },
  {
    name: "Sophie R.",
    role: "Coach business",
    initials: "SR",
    color: "linear-gradient(135deg,#f59e0b,#ef4444)",
    hook: "L'action à lancer aujourd'hui.",
    quote:
      "C'est ce qui change tout. Pas 20 pistes, une seule. Et le livrable est déjà écrit.",
    reply: "Merci Oni ❤️",
  },
  {
    name: "Thomas L.",
    role: "Founder solo",
    initials: "TL",
    color: "linear-gradient(135deg,#10b981,#0022ff)",
    hook: "Rare qu'un outil me surprenne.",
    quote:
      "J'ai testé. Deux semaines après, 3 anciens clients relancés, 1 signé. Sans magie, juste clair.",
  },
];
