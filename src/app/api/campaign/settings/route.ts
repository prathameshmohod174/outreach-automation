import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb, verifyFirebaseToken } from "@/lib/firebase-admin";

export const runtime = "nodejs";
const schema = z.object({
  windowStart: z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/),
  windowEnd: z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/),
  dailyLimit: z.number().int().min(1).max(50),
  sendingDays: z.array(z.number().int().min(0).max(6)).min(1).max(7)
}).refine((v) => v.windowStart < v.windowEnd, { message: "End time must be later than start time." });

export async function GET(request: NextRequest) {
  try {
    const user = await verifyFirebaseToken(request.headers.get("authorization"));
    const ref = adminDb().doc(`users/${user.uid}/campaigns/default`);
    const snapshot = await ref.get();
    const data = snapshot.data() || {};
    return NextResponse.json({
      windowStart: data.windowStart || "07:00",
      windowEnd: data.windowEnd || "10:00",
      dailyLimit: Number(data.dailyLimit || 5),
      sendingDays: Array.isArray(data.sendingDays) ? data.sendingDays : [1,2,3,4,5],
      timezone: "Asia/Kolkata"
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load campaign settings." }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await verifyFirebaseToken(request.headers.get("authorization"));
    const input = schema.parse(await request.json());
    const ref = adminDb().doc(`users/${user.uid}/campaigns/default`);
    await ref.set({ ...input, timezone: "Asia/Kolkata", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return NextResponse.json({ saved: true, ...input, timezone: "Asia/Kolkata" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save campaign settings." }, { status: error instanceof z.ZodError ? 400 : 401 });
  }
}
