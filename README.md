# Creative Outreach OS

A campaign-based creative outreach workspace built with Next.js, Firebase, Groq and Gemini.

## MVP
- Import prospects from CSV/XLSX and add contacts manually.
- Store company, person, website and public social profile information.
- Research public company websites and create source-linked AI prospect briefs.
- Generate personalised email drafts from saved prospect research and user-verified context.
- Edit, save, approve or reject each draft in the prospect workspace.
- Configure the scheduled sending window, weekdays and daily cap in Asia/Kolkata.
- Manually send up to 10 already-approved queue items with an explicit confirmation; manual sending bypasses the time window but not the daily cap.
- Export prospect and campaign data.

## Safety defaults
- Email delivery is disabled until Gmail OAuth is configured.
- No email can be sent without explicit approval.
- Every prospect email must be explicitly approved before delivery.
- Manual delivery is user-triggered; no unattended scheduler is included yet.
- The manual sender re-checks the prospect's approved status, approved subject/body snapshot and recipient before sending.
- Daily send attempts are capped using the saved campaign limit (default 5); failed attempts count toward the cap.
- Editing a draft invalidates its approval.
- Unknown contact details remain blank; never invent email addresses.
- Respect opt-outs and suppression lists.

## Stack
- Next.js App Router, TypeScript and Tailwind CSS
- Firebase Authentication and Firestore
- Groq API (primary when configured) and Gemini API (optional fallback), called from server-side routes only
- Gmail API OAuth (delivery phase)

## Deployment configuration
Configure Firebase client variables and `FIREBASE_SERVICE_ACCOUNT_BASE64` in the hosting provider's environment settings. Add `GROQ_API_KEY` to use Groq as the primary draft provider; optionally retain `GEMINI_API_KEY` as a fallback for transient Groq outages. If Groq is not configured, Gemini is used when its key is present. `GROQ_MODEL` defaults to `openai/gpt-oss-120b`. Never expose server credentials with a `NEXT_PUBLIC_` prefix.

## Local development
See `docs/SETUP.md` for setup and environment variables.

Never commit `.env.local`, Firebase service-account keys, OAuth credentials or API keys.
