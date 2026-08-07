import type { Metadata } from "next";
import { Red_Hat_Display, Fraunces } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

const redHat = Red_Hat_Display({
  variable: "--font-red-hat",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://cogniwis.ai"),
  title: "Cogniwis — Ton OS de décision stratégique",
  description:
    "Cogniwis, le Strategic Decision OS pour indépendants. Diagnostic, action, suivi — avec Oni, ton conseiller.",
  openGraph: {
    title: "Cogniwis — Ton OS de décision stratégique",
    description:
      "Une conversation avec Oni, un diagnostic honnête, une action à lancer aujourd'hui.",
    url: "https://cogniwis.ai",
    siteName: "Cogniwis",
    locale: "fr_FR",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="fr"
      className={`${redHat.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('cogniwis-theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <Navbar userEmail={user?.email ?? null} />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
