import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getAdminApp() {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!encoded) throw new Error("Firebase Admin is not configured.");
  const serviceAccount = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  return getApps().length ? getApps()[0] : initializeApp({ credential: cert(serviceAccount) });
}

export async function verifyFirebaseToken(authorization: string | null) {
  if (!authorization?.startsWith("Bearer ")) throw new Error("Missing Firebase bearer token.");
  return getAuth(getAdminApp()).verifyIdToken(authorization.slice(7));
}
