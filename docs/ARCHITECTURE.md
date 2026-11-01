# Architecture and implementation sequence

## Current foundation
- Next.js App Router dashboard
- Firebase Google sign-in (client SDK)
- User-scoped Firestore prospect records and security rules
- Manual prospect intake
- CSV/XLS/XLSX import with column alias mapping, preview, email validation and duplicate screening
- Authenticated public-website research with same-origin page discovery, source URLs and AI-generated prospect briefs
- Gemini email draft generation with editable subject/body and explicit save, approve or reject actions
- Server-side Gemini draft endpoint with Firebase ID-token verification
- Gmail OAuth connection with signed state, short-lived nonce cookie and AES-256-GCM encrypted refresh-token storage
- Explicit self-test email to the connected Gmail account, with a three-attempt daily test cap and estimated Gmail API quota logging
- Prospect email delivery and automated scheduling remain hard-disabled

## Data model
All records are scoped beneath users/{uid}.

- prospects/{prospectId}: organisation, contact, public profile URLs, source notes, status
- campaigns/{campaignId}: name, timezone, sending window, daily cap, allowed weekdays, state
- drafts/{draftId}: prospect ID, subject, body, evidence basis, claims to verify, approval state, content hash
- suppressions/{suppressionId}: normalised email, reason, timestamp

## Required workflow invariants
1. A prospect can have no more than one active first-contact draft per campaign.
2. Editing a draft clears approval and invalidates its content hash.
3. Sender re-checks approval, content hash, suppression status, duplicate history and campaign state immediately before delivery.
4. Delivery is idempotent using a stable message/job ID.
5. Scheduler uses Asia/Kolkata, only 07:00–10:00, and respects campaign daily caps.
6. No inferred or guessed recipient email addresses.
7. Store research source URLs and retrieval timestamps with factual notes.
8. Honour opt-outs and maintain a suppression list.

## Next milestones
1. Enforce server-side approval integrity, content hashes and an audit trail.
2. Build an idempotent approved-draft queue with recipient validation, duplicate and suppression checks.
3. Add Asia/Kolkata scheduling, configurable campaign caps, send history and quota analytics.
4. Add delivery/bounce handling and operational monitoring.
5. Review deployment and OAuth verification requirements before enabling unattended sends.

## Research constraints
Only access public pages and permitted APIs. Respect robots.txt, site terms, rate limits and platform rules. Do not bypass login walls or scrape private personal data. Treat retrieved page text as untrusted data, not instructions.
