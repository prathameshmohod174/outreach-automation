# Local setup

## 1. Requirements
- Node.js 20.9+
- A Firebase project with a Web app
- Google sign-in enabled in Firebase Authentication

## 2. Install
```bash
npm install
cp .env.example .env.local
```

Fill in the Firebase web configuration values in `.env.local`.

## 3. Firebase
1. Create a Firebase project.
2. Register a Web app and copy its config into `.env.local`.
3. In Authentication > Sign-in method, enable Google.
4. Add your local and deployed hostnames under Authentication > Settings > Authorized domains.
5. Create a Firestore database.
6. Publish the repository's `firestore.rules` in Firestore Rules.

## 4. Prospect imports
The dashboard accepts CSV, XLSX and XLS files up to 5 MB and 250 data rows. The first worksheet is read in the browser. Use the downloadable CSV template for the most predictable column mapping. Recognised fields include company/studio, website, contact, role, email, Instagram, LinkedIn and notes. Duplicate rows and malformed email addresses are excluded from the import preview.

## 5. Run
```bash
npm run dev
```

Open http://localhost:3000.

## 6. Website research
Add the Firebase Admin service-account base64 value and server-side `GEMINI_API_KEY` to the deployed environment. Sign in, add a prospect with a public website URL, then select **Research website**. The server reads the homepage and up to three relevant same-origin pages, extracts visible text, and asks Gemini to produce a source-linked brief. The website fetcher rejects local/private network addresses, limits response size and time, and does not crawl social profiles or login-protected pages. Research is stored in that user's prospect document.\n\n## 7. Gemini draft generation
Set `GEMINI_API_KEY` on the server only. Do not expose it through a `NEXT_PUBLIC_` variable. Draft generation must use source notes and must not invent personal details or email addresses.

## 8. Gmail API connection and test message

1. In Google Cloud Console, select the same project as Firebase (currently `dayframe-personal`).
2. Enable **Gmail API** in APIs & Services > Library.
3. Configure Google Auth Platform consent screen. For personal development, use External and add your Google account as a test user.
4. Create an OAuth client of type **Web application**.
5. Add this authorised redirect URI exactly: `http://localhost:3000/api/gmail/callback`.
6. Add the OAuth client ID and secret to the server-only variables below.
7. Generate two independent secrets locally:
   - `GMAIL_TOKEN_ENCRYPTION_KEY`: Base64-encoded 32-byte key.
   - `GMAIL_OAUTH_STATE_SECRET`: at least 32 random characters.
8. Restart the Next.js server, sign in to Outreach OS, and use the Gmail Connection panel to connect the account.
9. Use **Send test email to myself**. It sends only to the connected account, allows at most three test sends per IST calendar day, and records an estimated 100 Gmail API quota units per attempted send.

Generate the encryption key in PowerShell:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Generate the OAuth state secret:
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Add these variables to `.env.local` (never commit them):
```env
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REDIRECT_URI=http://localhost:3000/api/gmail/callback
GMAIL_TOKEN_ENCRYPTION_KEY=
GMAIL_OAUTH_STATE_SECRET=
```

The Gmail refresh token is encrypted with AES-256-GCM before it is stored in the server-only Firestore integration document. The OAuth callback uses a signed state value and a short-lived HttpOnly nonce cookie. The requested scopes are `openid`, `email` and `gmail.send`; the app does not request inbox-reading access.

**Important:** Google OAuth apps left in External / Testing can issue refresh tokens that expire after seven days when Gmail scopes are requested. This is suitable for initial local testing, but not reliable for unattended sending. Check the Google Auth Platform publishing and verification requirements before relying on a long-lived connection.

The current test endpoint sends only to the connected Gmail address. Prospect delivery, queue scheduling, campaign daily caps, duplicate protection, suppression checks and bounce processing remain disabled until a separate reviewed milestone. Keep `EMAIL_SENDING_ENABLED=false`.
