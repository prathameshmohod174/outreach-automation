import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Outreach OS",
  description: "Terms for using the Outreach OS creative outreach workspace."
};

const terms = [
  {
    title: "Purpose of the service",
    body: "Outreach OS is a workspace for organising prospect information, researching publicly accessible company websites and preparing AI-assisted outreach drafts. Features may change, be suspended or be discontinued."
  },
  {
    title: "Your account and information",
    body: "You are responsible for maintaining the security of your Google account and for the information you add to the workspace. You must have the rights and authority needed to submit and use contact details, notes, website content and other material."
  },
  {
    title: "Acceptable use and outreach",
    body: "Use the service lawfully and respectfully. You are responsible for complying with applicable privacy, data-protection, anti-spam, marketing and electronic-communications laws, including rules on consent, lawful basis, identification and opt-out requirements. Do not use the service for deceptive, harassing, unsolicited bulk or otherwise unlawful messaging. Respect requests not to be contacted and maintain your own suppression records where required."
  },
  {
    title: "AI-generated research and drafts",
    body: "Research briefs and email drafts are generated with AI and may contain errors, omissions or unsupported suggestions. They are provided as assistance, not as verified facts or legal advice. You must review sources, verify claims, check recipients and edit drafts before using them. Do not represent AI-generated statements as verified unless you have independently confirmed them."
  },
  {
    title: "Gmail connection and sending",
    body: "Gmail connection is optional and grants the application the permissions shown on Google's consent screen. The current Gmail test-send feature is limited to sending a test message to your own connected account. Prospect sending, campaign scheduling and automatic delivery are not currently available. Do not assume that approving a draft sends it."
  },
  {
    title: "Third-party services",
    body: "The service relies on third-party providers, including Google Firebase, Google Gemini, Google OAuth and Vercel. Their services are governed by their own terms and policies. Availability may depend on those providers and their quotas, restrictions or changes."
  },
  {
    title: "No warranty and limitation",
    body: "The service is provided on an “as is” and “as available” basis, without warranties to the extent permitted by law. To the extent permitted by applicable law, the operator is not liable for indirect or consequential loss, inaccurate AI output, provider outages, missed communications or actions you take based on unverified information. Nothing in these terms excludes liability that cannot legally be excluded."
  },
  {
    title: "Changes and contact",
    body: "These terms may be updated when the service or its features change. Continued use after an update means you accept the revised terms to the extent permitted by law. Questions can be sent to prathameshmohod3@gmail.com."
  }
];

export default function TermsPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <Link href="/" className="text-xs font-semibold tracking-[.2em] text-[#d4ff6a] hover:underline">← OUTREACH OS</Link>
        <p className="mt-12 text-[11px] font-semibold tracking-[.25em] text-[#d4ff6a]">LEGAL / TERMS</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Terms of Service</h1>
        <p className="mt-4 text-sm text-zinc-500">Effective date: 2 November 2026</p>
        <p className="mt-8 text-base leading-7 text-zinc-300">By accessing or using Outreach OS, you agree to these terms. If you do not agree, do not use the service.</p>
        <div className="mt-10 space-y-8">
          {terms.map((term) => (
            <section key={term.title}>
              <h2 className="text-lg font-semibold">{term.title}</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-400">{term.body}</p>
            </section>
          ))}
        </div>
        <p className="mt-10 border-t border-zinc-800 pt-7 text-sm text-zinc-500">Contact: <a className="text-[#d4ff6a] underline underline-offset-4" href="mailto:prathameshmohod3@gmail.com">prathameshmohod3@gmail.com</a></p>
      </div>
    </main>
  );
}
