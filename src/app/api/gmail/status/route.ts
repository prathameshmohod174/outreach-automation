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
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const usageSnapshot = await adminDb().doc(`users/${user.uid}/gmailUsage/${today}`).get();
    const usage = usageSnapshot.data() || {};
    return NextResponse.json({
      connected: true,
      email: snapshot.data()?.email || null,
      connectedAt: snapshot.data()?.connectedAt?.toDate?.()?.toISOString?.() || null,
      usage: {
        testAttempts: Number(usage.testAttempts || 0),
        estimatedQuotaUnits: Number(usage.estimatedQuotaUnits || 0),
        successfulTestSends: Number(usage.successfulTestSends || 0),
        failedTestSends: Number(usage.failedTestSends || 0)
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read Gmail connection status.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
