import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyFirebaseToken } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const requestSchema = z.object({
  companyName: z.string().min(1).max(200),
  contactName: z.string().max(160).optional(),
  senderName: z.string().min(1).max(120),
  senderRole: z.string().max(160).optional(),
  portfolioUrl: z.string().url().optional().or(z.literal(""))
});

export async function POST(request: NextRequest) {
  try {
    await verifyFirebaseToken(request.headers.get("authorization"));
    const input = requestSchema.parse(await request.json());
    const firstName = input.contactName?.trim().split(/\s+/)[0];
    const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
    const subject = "Could I support your next production?";
    const body = `${greeting} I’m ${input.senderName}, a freelance cinematographer, videographer and editor available for freelance production work. Would you be open to me sending over my portfolio?`;

    return NextResponse.json({
      subject,
      body,
      personalisationBasis: [],
      claimsToVerify: [],
      approvalRequired: true,
      provider: "template"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create the email template.";
    const status = error instanceof z.ZodError ? 400 : message.includes("token") || message.includes("Firebase") ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Could not create the email template." : message }, { status });
  }
}
