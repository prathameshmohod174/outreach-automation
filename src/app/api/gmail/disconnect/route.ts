import { NextRequest, NextResponse } from "next/server";
import { adminDb, verifyFirebaseToken } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyFirebaseToken(request.headers.get("authorization"));
    await adminDb().doc(`users/${user.uid}/integrations/gmail`).delete();
    return NextResponse.json({ disconnected: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not disconnect Gmail.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
