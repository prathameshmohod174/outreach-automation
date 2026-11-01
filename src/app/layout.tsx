import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Outreach OS — Creative partnerships",
  description: "Research, personalise and manage creative outreach campaigns."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="border-t border-zinc-800/80">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
            <span>Outreach OS · Creative partnerships workspace</span>
            <nav aria-label="Legal" className="flex gap-5">
              <a className="transition hover:text-[#d4ff6a]" href="/privacy">Privacy Policy</a>
              <a className="transition hover:text-[#d4ff6a]" href="/terms">Terms of Service</a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
