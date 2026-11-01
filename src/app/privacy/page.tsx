import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Outreach OS",
  description: "How Outreach OS collects, uses, stores and protects information."
};

const sections = [
  {
    title: "Information we process",
    body: [
      "Account information: when you sign in with Google, we receive basic account information such as your name, email address and Google account identifier through Firebase Authentication.",
      "Workspace information: prospect and company names, contact details, website and public social-profile URLs, notes, research briefs, email drafts and their review status that you add or generate in the workspace.",
      "Connected Gmail information: if you choose to connect Gmail, we receive the connected account's email address and an OAuth refresh token needed to request access for the Gmail send function. The refresh token is encrypted before it is stored. The app requests the Gmail send scope (gmail.send), not permission to read your inbox.",
      "Technical information: the hosting, authentication and security services may process standard request, diagnostic and security logs."
    ]
  },
  {
    title: "How information is used",
    body: [
      "To authenticate you and provide your private outreach workspace.",
      "To store and organise prospect records, research results and email drafts.",
      "To analyse public pages from a website URL you submit and generate a research brief. The submitted website extracts and relevant notes are sent to Google's Gemini API for processing.",
      "To generate email drafts from the prospect details and creative context you provide. The submitted draft-generation information is sent to Google's Gemini API.",
      "If you connect Gmail, to obtain an access token and send an email only when you explicitly use the available test-send function. The current test-send function sends to your own connected account; prospect email delivery and scheduled sending are not currently implemented."
    ]
  },
  {
    title: "Service providers and sharing",
    body: [
      "Outreach OS uses Google Firebase Authentication and Cloud Firestore for sign-in and workspace data, Google's Gemini API for AI-assisted research and draft generation, Google OAuth for Gmail authorisation, and Vercel for application hosting.",
      "Information is processed by these providers as needed to operate the features you request and is subject to their respective terms and privacy policies. We do not sell personal information or provide prospect lists to advertisers.",
      "We do not use submitted prospect information to contact people on your behalf without a separate sending feature and an explicit user action. AI-generated content should be reviewed and verified before use."
    ]
  },
  {
    title: "Gmail permissions and security",
    body: [
      "Connecting Gmail is optional. The app requests the gmail.send scope and basic account identity scopes. It does not request Gmail inbox-reading access.",
      "The Gmail refresh token is encrypted using AES-256-GCM before it is stored in Firestore. Keep the encryption configuration secure and do not share your account credentials or API keys.",
      "Disconnecting Gmail removes the stored integration record from the app. This action does not itself revoke the app's authorisation in your Google Account; you can also remove access from your Google Account security settings."
    ]
  },
  {
    title: "Retention and your choices",
    body: [
      "Workspace records are retained in the Firebase project while the workspace is in use. This version does not provide a complete self-service account or workspace deletion control. For a data-access or deletion request, contact us using the address below.",
      "You can stop using the service, avoid submitting information, and disconnect Gmail from the app. You can revoke Google access separately from your Google Account settings.",
      "Please do not submit sensitive personal information or information that you are not authorised to use."
    ]
  },
  {
    title: "Public website research",
    body: [
      "Website research is limited to publicly accessible pages on the website you submit. The application does not sign in to Instagram, LinkedIn or other restricted services, and it does not bypass login walls or access controls.",
      "Research output is AI-generated and may be incomplete or inaccurate. Source links are provided where available; verify important claims independently."
    ]
  },
  {
    title: "Children and changes",
    body: [
      "Outreach OS is a professional productivity tool and is not intended for children under 13.",
      "This policy may be updated as features or data practices change. The effective date below indicates the latest revision."
    ]
  }
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <Link href="/" className="text-xs font-semibold tracking-[.2em] text-[#d4ff6a] hover:underline">← OUTREACH OS</Link>
        <p className="mt-12 text-[11px] font-semibold tracking-[.25em] text-[#d4ff6a]">LEGAL / PRIVACY</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Privacy Policy</h1>
        <p className="mt-4 text-sm text-zinc-500">Effective date: 2 November 2026</p>
        <p className="mt-8 text-base leading-7 text-zinc-300">This policy explains how Outreach OS handles information when you use the application. Outreach OS is a creative-outreach workspace operated by the application owner.</p>
        <div className="mt-10 space-y-9">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-zinc-400">
                {section.body.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          ))}
        </div>
        <section className="mt-10 border-t border-zinc-800 pt-7">
          <h2 className="text-lg font-semibold">Contact</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-400">For privacy questions or data requests, email <a className="text-[#d4ff6a] underline underline-offset-4" href="mailto:prathameshmohod3@gmail.com">prathameshmohod3@gmail.com</a>.</p>
        </section>
      </div>
    </main>
  );
}
