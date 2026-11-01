import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Outreach OS — Creative partnerships",
  description: "Research, personalise and manage creative outreach campaigns."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}