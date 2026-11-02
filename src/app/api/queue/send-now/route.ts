import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, verifyFirebaseToken } from "@/lib/firebase-admin";
import { decryptRefreshToken, getGmailAccessToken } from "@/lib/gmail";

export const runtime = "nodejs";
const TZ = "Asia/Kolkata";
const dateKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const encode = (value: string) => Buffer.from(value, "utf8").toString("base64url");

export async function POST(request: NextRequest) {
  try {
    const user = await verifyFirebaseToken(request.headers.get("authorization"));
    const db = adminDb();
    const userPath = `users/${user.uid}`;
    const gmailSnap = await db.doc(`${userPath}/integrations/gmail`).get();
    const gmail = gmailSnap.data();
    if (!gmailSnap.exists || gmail?.status !== "connected" || !gmail.email || !gmail.token) {
      return NextResponse.json({ error: "Connect Gmail before sending approved emails." }, { status: 409 });
    }
    const settingsSnap = await db.doc(`${userPath}/campaigns/default`).get();
    const dailyLimit = Math.min(50, Math.max(1, Number(settingsSnap.data()?.dailyLimit || 5)));
    const today = dateKey();
    const usageRef = db.doc(`${userPath}/sendUsage/${today}`);
    const refreshToken = decryptRefreshToken(gmail.token as { ciphertext: string; iv: string; tag: string });
    const accessToken = await getGmailAccessToken(refreshToken);
    const queueSnap = await db.collection(`${userPath}/sendQueue`).where("status", "==", "queued").limit(10).get();
    if (queueSnap.empty) return NextResponse.json({ sent: 0, failed: 0, message: "There are no approved emails waiting in the queue." });

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    for (const queuedDoc of queueSnap.docs) {
      const queueRef = queuedDoc.ref;
      const prospectRef = db.doc(`${userPath}/prospects/${queuedDoc.id}`);
      const claim = await db.runTransaction(async (tx) => {
        const [q, p, usage] = await Promise.all([tx.get(queueRef), tx.get(prospectRef), tx.get(usageRef)]);
        if (!q.exists || q.data()?.status !== "queued" || !p.exists) return null;
        const item = q.data()!;
        const prospect = p.data()!;
        if (prospect.status !== "approved" || prospect.draft?.status !== "approved" ||
            prospect.draft?.subject !== item.subject || prospect.draft?.body !== item.body ||
            prospect.email !== item.recipient || prospect.status === "suppressed") {
          tx.update(queueRef, { status: "failed", failureReason: "Approval or recipient no longer matches the queued snapshot.", updatedAt: FieldValue.serverTimestamp() });
          return { blocked: true as const };
        }
        const used = Number(usage.data()?.attempts || 0);
        if (used >= dailyLimit) return { limit: true as const };
        tx.set(usageRef, { attempts: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        tx.update(queueRef, { status: "sending", sendingStartedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
        return { blocked: false as const, item };
      });
      if (!claim) { skipped++; continue; }
      if ("limit" in claim) break;
      if (claim.blocked) { failed++; continue; }

      try {
        const item = claim.item;
        const raw = [
          `To: ${item.recipient}`,
          `Subject: ${String(item.subject).replace(/[\r\n]/g, " ")}`,
          "MIME-Version: 1.0",
          'Content-Type: text/plain; charset="UTF-8"',
          "Content-Transfer-Encoding: 8bit",
          "",
          String(item.body).replace(/\r?\n/g, "\r\n")
        ].join("\r\n");
        const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ raw: encode(raw) })
        });
        const result = await response.json() as { id?: string; error?: { message?: string } };
        if (!response.ok) throw new Error(result.error?.message || `Gmail API returned HTTP ${response.status}.`);
        await db.runTransaction(async (tx) => {
          tx.update(queueRef, { status: "sent", sentAt: FieldValue.serverTimestamp(), gmailMessageId: result.id || null, updatedAt: FieldValue.serverTimestamp() });
          tx.update(prospectRef, { status: "sent", sentAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
          tx.set(usageRef, { successfulSends: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        });
        sent++;
      } catch (error) {
        await queueRef.update({ status: "failed", failureReason: error instanceof Error ? error.message.slice(0, 300) : "Gmail delivery failed.", failedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
        await usageRef.set({ failedSends: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        failed++;
      }
    }
    const remaining = Math.max(0, dailyLimit - Number((await usageRef.get()).data()?.attempts || 0));
    return NextResponse.json({ sent, failed, skipped, remainingToday: remaining, dailyLimit, date: today, mode: "manual" });
  } catch (error) {
    console.error("[queue/send-now]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not process the send queue." }, { status: 400 });
  }
}
