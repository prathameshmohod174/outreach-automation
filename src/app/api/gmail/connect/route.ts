import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { createOAuthNonce, getGmailOAuthClient, getGmailScopes, signOAuthState } from "@/lib/gmail";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyFirebaseToken(request.headers.get("authorization"));
    const nonce = createOAuthNonce();
    const state = signOAuthState({ uid: user.uid, nonce, issuedAt: Date.now() });
    const url = getGmailOAuthClient().generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: true,
      scope: getGmailScopes(),
      state
    });
    const response = NextResponse.json({ authorizationUrl: url });
    response.cookies.set("gmail_oauth_nonce", nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/gmail/callback",
      maxAge: 10 * 60
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start Gmail connection.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
