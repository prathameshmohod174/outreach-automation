import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, verifyFirebaseToken } from "@/lib/firebase-admin";
import { decryptRefreshToken, getGmailAccessToken } from "@/lib/gmail";

export const runtime = "nodejs";

function istDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function encodeMessage(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyFirebaseToken(request.headers.get("authorization"));
    const db = adminDb();
    const connectionRef = db.doc(`users/${user.uid}/integrations/gmail`);
    const connection = await connectionRef.get();
    const data = connection.data();
    if (!connection.exists || data?.status !== "connected" || !data.email || !data.token) {
      return NextResponse.json({ error: "Connect a Gmail account before sending a test message." }, { status: 409 });
    }
    if (!process.env.GMAIL_TOKEN_ENCRYPTION_KEY) {
      return NextResponse.json({ error: "Gmail token encryption is not configured." }, { status: 503 });
    }

    const dateKey = istDateKey();
    const usageRef = db.doc(`users/${user.uid}/gmailUsage/${dateKey}`);
    const usageSnapshot = await usageRef.get();
    const testAttempts = Number(usageSnapshot.data()?.testAttempts || 0);
    if (testAttempts >= 3) {
      return NextResponse.json({ error: "The limit of 3 Gmail test messages per IST calendar day has been reached." }, { status: 429 });
    }
    await usageRef.set({
      testAttempts: FieldValue.increment(1),
      estimatedQuotaUnits: FieldValue.increment(100),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    const refreshToken = decryptRefreshToken(data.token as { ciphertext: string; iv: string; tag: string });
    const accessToken = await getGmailAccessToken(refreshToken);
    const subject = "Outreach OS — Gmail connection test";
    const body = [
      "Your Gmail API connection is working.",
      "",
      "This is a test message sent by Outreach OS to the connected Gmail account.",
      "No prospect was contacted and no approved draft was sent.",
      "",
      "You can safely ignore this message."
    ].join("\r\n");
    const raw = [
      `To: ${data.email}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      body
    ].join("\r\n");

    const gmailResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ raw: encodeMessage(raw) })
    });
    const result = await gmailResponse.json() as { id?: string; threadId?: string; error?: { message?: string } };
    await usageRef.set({
      successfulTestSends: FieldValue.increment(gmailResponse.ok ? 1 : 0),
      failedTestSends: FieldValue.increment(gmailResponse.ok ? 0 : 1),
      lastAttemptAt: FieldValue.serverTimestamp(),
      lastAttemptStatus: gmailResponse.ok ? "sent" : "failed",
      ...(gmailResponse.ok ? { lastMessageId: result.id || null } : { lastError: result.error?.message || `Gmail API returned HTTP ${gmailResponse.status}.` })
    }, { merge: true });

    if (!gmailResponse.ok) {
      return NextResponse.json({
        error: result.error?.message || `Gmail API returned HTTP ${gmailResponse.status}.`,
        quotaUnitsRecorded: 100
      }, { status: 502 });
    }
    return NextResponse.json({
      sent: true,
      recipient: data.email,
      messageId: result.id,
      quotaUnitsRecorded: 100,
      date: dateKey
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gmail test send failed.";
    console.error("[gmail/test-send] Failed", { message });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
