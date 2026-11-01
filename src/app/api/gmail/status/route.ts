import { NextRequest, NextResponse } from "next/server";
import { adminDb, verifyFirebaseToken } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyFirebaseToken(request.headers.get("authorization"));
    const snapshot = await adminDb().doc(`users/${user.uid}/integrations/gmail`).get();
    if (!snapshot.exists || snapshot.data()?.status !== "connected") {
      return NextResponse.json({ connected: false });
    }
    return NextResponse.json({
      connected: true,
      email: snapshot.data()?.email || null,
      connectedAt: snapshot.data()?.connectedAt?.toDate?.()?.toISOString?.() || null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read Gmail connection status.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
