import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifyFirebaseToken } from "@/lib/firebase-admin";
import { DEFAULT_WRITING_VOICE } from "@/lib/writing-voice";

export const runtime = "nodejs";

const requestSchema = z.object({
  companyName: z.string().min(1).max(200),
  contactName: z.string().max(160).optional(),
  role: z.string().max(160).optional(),
  website: z.string().url().optional().or(z.literal("")),
  creativeWork: z.string().min(20).max(6000),
  opportunity: z.string().min(10).max(2000),
  senderName: z.string().min(1).max(120),
  senderRole: z.string().max(160).optional(),
  portfolioUrl: z.string().url().optional().or(z.literal(""))
});

export async function POST(request: NextRequest) {
  try {
    const user = await verifyFirebaseToken(request.headers.get("authorization"));
    const input = requestSchema.parse(await request.json());
    const voiceSnapshot = await adminDb().doc(`users/${user.uid}/settings/writingVoice`).get();
    const writingVoice = voiceSnapshot.exists ? voiceSnapshot.data() : DEFAULT_WRITING_VOICE;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Gemini is not configured on the server." }, { status: 503 });

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json", temperature: 0.65 }
    });

    const prompt = `You write concise, genuinely personalised first-contact emails for a freelance creative professional.

Return JSON only with this exact shape:
{"subject":"...","body":"...","personalisation_basis":["..."],"claims_to_verify":["..."]}

Rules:
- Use only facts explicitly present in the supplied prospect details and creative-work notes.
- Refer to specific work or creative characteristics only when the notes support them.
- Never claim the sender watched, loved, admired or worked on something unless the input explicitly says so.
- Do not invent contact details, job openings, mutual connections, budgets or prior conversations.
- Write naturally, specifically and respectfully. Follow the supplied sender voice profile for tone, rhythm, vocabulary and length. Do not imitate a generic marketing template.
- Make a clear, low-pressure proposal for a conversation or relevant collaboration.
- Avoid mass-mailing language, exaggerated praise, fake familiarity or generic flattery.
- If evidence is insufficient, say so in claims_to_verify and write a conservative draft.
- Include the sender's portfolio only if supplied.
- No misleading subject lines or urgency.

Prospect details:
${JSON.stringify(input)}`;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());
    if (typeof parsed.subject !== "string" || typeof parsed.body !== "string") {
      return NextResponse.json({ error: "The AI returned an invalid draft." }, { status: 502 });
    }
    return NextResponse.json({
      subject: parsed.subject.slice(0, 180),
      body: parsed.body.slice(0, 5000),
      personalisationBasis: Array.isArray(parsed.personalisation_basis) ? parsed.personalisation_basis : [],
      claimsToVerify: Array.isArray(parsed.claims_to_verify) ? parsed.claims_to_verify : [],
      approvalRequired: true
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Draft generation failed.";
    const status = message.includes("token") || message.includes("Firebase") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
