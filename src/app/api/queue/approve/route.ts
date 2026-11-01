import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb, verifyFirebaseToken } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const approvalSchema = z.object({
  prospectId: z.string().min(1).max(160),
  subject: z.string().trim().min(1).max(250),
  body: z.string().trim().min(1).max(10000)
});

export async function POST(request: NextRequest) {
  try {
    const user = await verifyFirebaseToken(request.headers.get("authorization"));
    const input = approvalSchema.parse(await request.json());
    const db = adminDb();
    const prospectRef = db.doc(`users/${user.uid}/prospects/${input.prospectId}`);
    const queueRef = db.doc(`users/${user.uid}/sendQueue/${input.prospectId}`);

    const result = await db.runTransaction(async (transaction) => {
      const [prospectSnapshot, queueSnapshot] = await Promise.all([
        transaction.get(prospectRef),
        transaction.get(queueRef)
      ]);
      if (!prospectSnapshot.exists) throw new Error("Prospect not found.");
      const prospect = prospectSnapshot.data();
      if (!prospect?.email || typeof prospect.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(prospect.email)) {
        throw new Error("Add a valid recipient email address before approving this draft.");
      }
      if (!prospect.draft || typeof prospect.draft !== "object") throw new Error("Generate and save a draft before approving it.");
      if (prospect.status === "sent" || prospect.status === "suppressed") throw new Error("This prospect cannot be queued because it is already sent or suppressed.");
      if (queueSnapshot.exists) {
        const existingStatus = queueSnapshot.data()?.status;
        if (existingStatus === "queued" || existingStatus === "sending" || existingStatus === "sent") {
          throw new Error("This prospect already has an active or completed queue item.");
        }
      }

      const now = new Date().toISOString();
      transaction.set(queueRef, {
        prospectId: input.prospectId,
        companyName: String(prospect.companyName || ""),
        recipient: prospect.email,
        subject: input.subject,
        body: input.body,
        status: "queued",
        approvedAt: now,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
      transaction.update(prospectRef, {
        draft: { ...prospect.draft, subject: input.subject, body: input.body, status: "approved", approvedAt: now, editedAt: now },
        status: "approved",
        approvedAt: now,
        updatedAt: FieldValue.serverTimestamp()
      });
      return { recipient: prospect.email, companyName: String(prospect.companyName || "") };
    });

    return NextResponse.json({ approved: true, queued: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not approve this email.";
    const status = error instanceof z.ZodError ? 400 : message.includes("already has") ? 409 : message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
