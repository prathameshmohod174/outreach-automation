# Creative Outreach OS

A campaign-based creative outreach workspace built with Next.js and Firebase.

## MVP
- Import prospects from CSV/XLSX and add contacts manually.
- Store company, person and contact information.
- Create concise, fixed-template first-contact emails without an AI model or recipient-specific sales copy.
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
- Deterministic server-side email template; no AI provider or model API required
- Gmail API OAuth (delivery phase)

## Deployment configuration
Configure Firebase client variables and `FIREBASE_SERVICE_ACCOUNT_BASE64` in the hosting provider's environment settings. Draft creation uses a fixed template and requires no AI API keys.

## Local development
See `docs/SETUP.md` for setup and environment variables.

Never commit `.env.local`, Firebase service-account keys, OAuth credentials or API keys.
