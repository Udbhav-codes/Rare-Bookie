import type { Metadata, Viewport } from "next";
import { Courier_Prime, Gloock, Hanken_Grotesk } from "next/font/google";
import { Header } from "@/components/Header";
import { LoadingScreen } from "@/components/LoadingScreen";
import { getAdmin } from "@/lib/auth";
import { getLibrarySettings } from "@/lib/data";
import "./globals.css";

const display = Gloock({ weight: "400", subsets: ["latin"], variable: "--font-gloock", display: "swap" });
const sans = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });
const mono = Courier_Prime({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-courier", display: "swap" });

export const dynamic = "force-dynamic";

/** Page titles follow the library name set in the database, so renaming needs no code change. */
export async function generateMetadata(): Promise<Metadata> {
  const { libraryName } = await getLibrarySettings();
  return {
    title: { default: libraryName, template: `%s · ${libraryName}` },
    description: `Browse the ${libraryName} library, see what's available and find which rack each book is on.`,
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ede8d8" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1424" },
  ],
};

const themeScript = `try{var t=localStorage.getItem('rb-theme');if(t)document.documentElement.dataset.theme=t;if(sessionStorage.getItem('rb-loaded'))document.documentElement.dataset.seen='1';}catch(e){}`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [admin, settings] = await Promise.all([getAdmin(), getLibrarySettings()]);
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2">
          Skip to content
        </a>
        <LoadingScreen libraryName={settings.libraryName} />
        <Header admin={admin} libraryName={settings.libraryName} />
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
