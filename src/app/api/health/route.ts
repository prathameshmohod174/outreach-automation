import { NextResponse } from "next/server";
import { firebaseConfigured } from "@/lib/firebase";
export async function GET() {
  return NextResponse.json({ status: "ok", firebaseClientConfigured: firebaseConfigured, emailSendingEnabled: false });
}