import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function readServiceAccount() {
  const configured = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim();
  if (!configured) {
    throw new Error("Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_BASE64 in .env.local.");
  }

  // Accept a raw JSON document as well as Base64 to make local setup less error-prone.
  const candidate = configured.startsWith("{")
    ? configured
    : Buffer.from(configured, "base64").toString("utf8").replace(/^\uFEFF/, "").trim();

  if (!candidate.startsWith("{")) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_BASE64 is not valid Base64-encoded service-account JSON. Recreate it from the complete downloaded Firebase Admin SDK JSON file."
    );
  }

  let serviceAccount: unknown;
  try {
    serviceAccount = JSON.parse(candidate);
  } catch {
    throw new Error(
      "Firebase Admin service-account credentials are not valid JSON. Re-encode the original downloaded service-account JSON file."
    );
  }

  if (
    !serviceAccount ||
    typeof serviceAccount !== "object" ||
    !("project_id" in serviceAccount) ||
    !("client_email" in serviceAccount) ||
    !("private_key" in serviceAccount)
  ) {
    throw new Error(
      "Firebase Admin credentials are missing project_id, client_email, or private_key. Use the complete Firebase Admin SDK service-account JSON file."
    );
  }

  const expectedProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const serviceProjectId = (serviceAccount as { project_id: string }).project_id;
  if (expectedProjectId && serviceProjectId !== expectedProjectId) {
    throw new Error(
      "Firebase project mismatch: the Admin service account project_id does not match NEXT_PUBLIC_FIREBASE_PROJECT_ID."
    );
  }

  return serviceAccount as {
    project_id: string;
    client_email: string;
    private_key: string;
  };
}

function getAdminApp() {
  const existing = getApps().find((app) => app.name === "[DEFAULT]");
  if (existing) return existing;
  return initializeApp({ credential: cert(readServiceAccount()) });
}

export function adminDb() {
  return getFirestore(getAdminApp());
}

export async function verifyFirebaseToken(authorization: string | null) {
  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Missing Firebase bearer token.");
  }
  return getAuth(getAdminApp()).verifyIdToken(authorization.slice(7));
}
