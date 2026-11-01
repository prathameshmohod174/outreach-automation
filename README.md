# Creative Outreach OS

A campaign-based creative outreach workspace built with Next.js, Firebase and Gemini.

## MVP
- Import prospects from CSV/XLSX and add contacts manually.
- Store company, person, website and public social profile information.
- Research public company websites and create source-linked AI prospect briefs.
- Generate personalised email drafts from saved prospect research and user-verified context.
- Edit, save, approve or reject each draft in the prospect workspace.
- Schedule approved emails between 07:00 and 10:00 Asia/Kolkata.
- Enforce configurable daily campaign limits, duplicate checks and suppression lists.
- Export prospect and campaign data.

## Safety defaults
- Email delivery is disabled until Gmail OAuth is configured.
- No email can be sent without explicit approval.
- Draft approval is a review state only; automated sending is not implemented.
- Editing a draft invalidates its approval.
- Unknown contact details remain blank; never invent email addresses.
- Respect opt-outs and suppression lists.

## Stack
- Next.js App Router, TypeScript and Tailwind CSS
- Firebase Authentication and Firestore
- Gemini API via server-side routes only
- Gmail API OAuth (delivery phase)

## Deployment configuration
Configure Firebase client variables, `FIREBASE_SERVICE_ACCOUNT_BASE64`, and `GEMINI_API_KEY` in the hosting provider's environment settings. Never expose server credentials with a `NEXT_PUBLIC_` prefix.

## Local development
See `docs/SETUP.md` for setup and environment variables.

Never commit `.env.local`, Firebase service-account keys, OAuth credentials or API keys.
