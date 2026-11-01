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

## 4. Run
```bash
npm run dev
```

Open http://localhost:3000.

## 5. Gemini (next milestone)
Set `GEMINI_API_KEY` on the server only. Do not expose it through a `NEXT_PUBLIC_` variable. Draft generation must use source notes and must not invent personal details or email addresses.

## 6. Email delivery (not enabled yet)
Gmail OAuth, sending, queue workers, bounce processing and unsubscribe handling are deliberately not part of this first scaffold. Keep `EMAIL_SENDING_ENABLED=false` until those controls are implemented and tested.
