import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { OAuth2Client } from "google-auth-library";

const GMAIL_SCOPES = ["openid", "email", "https://www.googleapis.com/auth/gmail.send"];

export function getGmailOAuthClient() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.GMAIL_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Gmail OAuth is not configured. Add the Gmail client ID, client secret and redirect URI to .env.local.");
  }
  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

export function getGmailScopes() {
  return GMAIL_SCOPES;
}

function getEncryptionKey() {
  const configured = process.env.GMAIL_TOKEN_ENCRYPTION_KEY;
  if (!configured) throw new Error("GMAIL_TOKEN_ENCRYPTION_KEY is not configured.");
  const key = Buffer.from(configured, "base64");
  if (key.length !== 32) throw new Error("GMAIL_TOKEN_ENCRYPTION_KEY must be a Base64-encoded 32-byte key.");
  return key;
}

export function encryptRefreshToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    algorithm: "aes-256-gcm"
  };
}

export function decryptRefreshToken(record: { ciphertext: string; iv: string; tag: string }) {
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(record.iv, "base64"));
  decipher.setAuthTag(Buffer.from(record.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(record.ciphertext, "base64")),
    decipher.final()
  ]).toString("utf8");
}

function getStateSecret() {
  const secret = process.env.GMAIL_OAUTH_STATE_SECRET;
  if (!secret || secret.length < 32) throw new Error("GMAIL_OAUTH_STATE_SECRET must contain at least 32 characters.");
  return secret;
}

export function signOAuthState(payload: { uid: string; nonce: string; issuedAt: number }) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", getStateSecret()).update(encoded).digest("base64url");
  return encoded + "." + signature;
}

export function verifyOAuthState(state: string) {
  const [encoded, suppliedSignature] = state.split(".");
  if (!encoded || !suppliedSignature || state.split(".").length !== 2) throw new Error("Invalid Gmail OAuth state.");
  const expected = createHmac("sha256", getStateSecret()).update(encoded).digest();
  const supplied = Buffer.from(suppliedSignature, "base64url");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new Error("Gmail OAuth state signature is invalid.");
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as { uid?: unknown; nonce?: unknown; issuedAt?: unknown };
  if (
    typeof payload.uid !== "string" || !payload.uid ||
    typeof payload.nonce !== "string" || !payload.nonce ||
    typeof payload.issuedAt !== "number" ||
    Date.now() - payload.issuedAt > 10 * 60 * 1000 ||
    payload.issuedAt > Date.now() + 60_000
  ) throw new Error("Gmail OAuth state has expired or is invalid.");
  return payload as { uid: string; nonce: string; issuedAt: number };
}

export function createOAuthNonce() {
  return randomBytes(32).toString("base64url");
}

export function constantTimeStringMatch(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function getGmailAccessToken(refreshToken: string) {
  const client = getGmailOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  const result = await client.getAccessToken();
  if (!result.token) throw new Error("Google did not return a Gmail access token. Reconnect your Gmail account.");
  return result.token;
}
