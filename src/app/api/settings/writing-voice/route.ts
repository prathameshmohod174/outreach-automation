import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifyFirebaseToken } from "@/lib/firebase-admin";
import { DEFAULT_WRITING_VOICE } from "@/lib/writing-voice";
export const runtime = "nodejs";
const schema = z.object({
 profileName:z.string().trim().min(1).max(100), identity:z.string().trim().min(1).max(1000), tone:z.string().trim().min(1).max(500),
 personality:z.array(z.string().trim().min(1).max(80)).max(20), writingRules:z.array(z.string().trim().min(1).max(300)).max(30),
 avoid:z.array(z.string().trim().min(1).max(200)).max(30), preferredClosing:z.array(z.string().trim().min(1).max(240)).max(10), targetLength:z.string().trim().min(1).max(80)
});
export async function GET(request:NextRequest) {
 try {
  const user=await verifyFirebaseToken(request.headers.get("authorization"));
  const snap=await adminDb().doc("users/"+user.uid+"/settings/writingVoice").get();
  return NextResponse.json({profile:snap.exists?snap.data():DEFAULT_WRITING_VOICE});
 } catch(error) { return NextResponse.json({error:error instanceof Error?error.message:"Could not load writing voice."},{status:401}); }
}
export async function PUT(request:NextRequest) {
 try {
  const user=await verifyFirebaseToken(request.headers.get("authorization"));
  const profile=schema.parse(await request.json());
  await adminDb().doc("users/"+user.uid+"/settings/writingVoice").set({...profile,updatedAt:new Date().toISOString()});
  return NextResponse.json({saved:true,profile});
 } catch(error) {
  const message=error instanceof Error?error.message:"Could not save writing voice.";
  return NextResponse.json({error:message},{status:error instanceof z.ZodError?400:401});
 }
}
