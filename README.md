# Creative Outreach OS

A campaign-based creative outreach workspace built with Next.js, Firebase and Gemini.

## MVP
- Import prospects from CSV/XLSX and add contacts manually.
- Store company, person, website and public social profile information.
- Generate individually researched email drafts with Gemini.
- Review, edit, approve or reject every draft.
- Schedule approved emails between 07:00 and 10:00 Asia/Kolkata.
- Enforce configurable daily campaign limits, duplicate checks and suppression lists.
- Export prospect and campaign data.

## Safety defaults
- Email delivery is disabled until Gmail OAuth is configured.
- No email can be sent without explicit approval.
- Editing a draft invalidates its approval.
- Unknown contact details remain blank; never invent email addresses.
- Respect opt-outs and suppression lists.

## Stack
- Next.js App Router, TypeScript and Tailwind CSS
- Firebase Authentication and Firestore
- Gemini API via server-side routes only
- Gmail API OAuth (delivery phase)

## Local development
See `docs/SETUP.md` for setup and environment variables.

Never commit `.env.local`, Firebase service-account keys, OAuth credentials or API keys.
