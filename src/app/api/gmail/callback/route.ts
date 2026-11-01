import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { encryptRefreshToken, getGmailOAuthClient, verifyOAuthState, constantTimeStringMatch } from "@/lib/gmail";

export const runtime = "nodejs";

function returnToApp(request: NextRequest, result: "connected" | "error", reason?: string) {
  const url = new URL("/", request.url);
  url.searchParams.set("gmail", result);
  if (reason) url.searchParams.set("reason", reason.slice(0, 180));
  const response = NextResponse.redirect(url);
  response.cookies.set("gmail_oauth_nonce", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/gmail/callback",
    maxAge: 0
  });
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const providerError = request.nextUrl.searchParams.get("error");
    if (providerError) return returnToApp(request, "error", providerError);
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const cookieNonce = request.cookies.get("gmail_oauth_nonce")?.value;
    if (!code || !state || !cookieNonce) throw new Error("Gmail connection was cancelled or its security check expired.");

    const payload = verifyOAuthState(state);
    if (!constantTimeStringMatch(payload.nonce, cookieNonce)) throw new Error("Gmail OAuth security check failed. Please reconnect.");
    const client = getGmailOAuthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      throw new Error("Google did not return a refresh token. Reconnect and approve the requested Gmail permission.");
    }
    client.setCredentials(tokens);
    const userInfo = await client.request<{ email?: string; email_verified?: boolean }>({
      url: "https://openidconnect.googleapis.com/v1/userinfo"
    });
    if (!userInfo.data.email || userInfo.data.email_verified !== true) {
      throw new Error("Google did not provide a verified Gmail address.");
    }

    const encrypted = encryptRefreshToken(tokens.refresh_token);
    await adminDb().doc(`users/${payload.uid}/integrations/gmail`).set({
      email: userInfo.data.email,
      token: encrypted,
      scopes: ["openid", "email", "https://www.googleapis.com/auth/gmail.send"],
      connectedAt: FieldValue.serverTimestamp(),
      status: "connected"
    });
    return returnToApp(request, "connected");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gmail connection failed.";
    console.error("[gmail/callback] Connection failed", { message });
    return returnToApp(request, "error", message);
  }
}
