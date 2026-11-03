import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyFirebaseToken } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const MAX_GEMINI_RETRIES = 3;
const RETRY_DELAYS_MS = [2_000, 4_000, 8_000];

function getGeminiStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const value = error as { status?: unknown; statusCode?: unknown; response?: { status?: unknown }; message?: unknown };
  for (const candidate of [value.status, value.statusCode, value.response?.status]) {
    if (typeof candidate === "number") return candidate;
  }
  if (typeof value.message === "string") {
    const match = value.message.match(/\[(\d{3})\]/);
    if (match) return Number(match[1]);
  }
  return undefined;
}

function isTransientGeminiError(error: unknown): boolean {
  const status = getGeminiStatus(error);
  if (status !== undefined) return [429, 500, 502, 503, 504].includes(status);
  const message = error instanceof Error ? error.message : String(error);
  return /fetch failed|network error|ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket hang up/i.test(message);
}

async function generateWithRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isTransientGeminiError(error) || attempt >= MAX_GEMINI_RETRIES) throw error;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt] ?? 8_000));
    }
  }
}


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
    await verifyFirebaseToken(request.headers.get("authorization"));
    const input = requestSchema.parse(await request.json());
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Gemini is not configured on the server." }, { status: 503 });

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json", temperature: 0.65 }
    });

    const prompt = `You are an expert B2B email copywriter specializing in professional creative-industry outreach.

Your task is to write personalized, human-sounding cold emails for a freelance cinematographer, videographer, and video editor operating under the creative brand Random Hours.

Primary objective:
Write emails that introduce the freelancer to production houses, creative studios, advertising agencies, and film-production companies, with the goal of establishing professional connections and exploring freelance collaboration opportunities.

Writing guidelines:
1. Write like a real professional reaching out personally, not like an automated marketing campaign.
2. Keep the email concise, ideally between 80 and 130 words.
3. Use a conversational yet professional tone.
4. Avoid unnecessarily sophisticated vocabulary, corporate jargon, and overly formal expressions.
5. Avoid generic openings such as "I hope this email finds you well", "I am reaching out after learning about", or "I wanted to introduce myself".
6. Reference one specific, relevant aspect of the recipient's actual work or services. Never invent information about the recipient or their company.
7. Explain briefly how the freelancer's skills could support their production team.
8. Avoid exaggerated claims, excessive self-promotion, urgency, and pushy sales language.
9. Include only one portfolio link, preferably as a plain-text HTTPS URL.
10. Use a natural closing that invites a response without demanding a meeting or immediate commitment.
11. Do not use marketing language, promotional slogans, excessive punctuation, emojis, or unnecessary formatting.
12. Avoid repetitive sentence structures and phrases across different recipients.
13. Never falsely imply an existing relationship, referral, previous conversation, or familiarity with the recipient.

Email structure:
- Natural greeting using the recipient's first name when provided. If no name is supplied, use a neutral greeting; never invent a name.
- Personalized opening referencing their actual work.
- Brief introduction of Prathamesh and his freelance services.
- A relevant explanation of potential collaboration.
- One portfolio URL, only if supplied.
- Simple, low-pressure closing.
- Professional email signature identifying Prathamesh Mohod and Random Hours.

Deliverability-conscious formatting:
- Generate clean, standards-compliant email copy.
- Keep the message readable in plain text.
- Do not add unnecessary links, attachments, tracking language, or HTML decorations.
- Do not claim that any wording or formatting guarantees inbox placement.

Output requirements:
- Return a concise, relevant subject line and the complete email body.
- Do not include explanations or commentary in the email content.
- The email body should contain only the greeting, message, portfolio URL (if supplied), closing, and signature.
- The final email must feel individually written for the recipient rather than generated from a reusable sales template.

Factual constraints:
- Use only facts explicitly present in the prospect details and supplied research notes.
- Do not invent recipient projects, services, relationships, hiring needs, or production capacity.
- Do not claim to have watched, loved, admired, or worked on anything unless the supplied information supports that statement.
- If there is not enough verified information for a specific personal reference, do not fabricate one. Keep the draft conservative and flag the missing evidence in claims_to_verify.
- Use the sender name, role, and portfolio URL supplied in the input. Never add a second link.
- The subject and body are the only user-facing copy. Return the existing JSON response structure for the application, with personalisation_basis and claims_to_verify as concise internal review metadata.

Prospect details:
${JSON.stringify(input)}`;

    const result = await generateWithRetry(() => model.generateContent(prompt));
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
    const geminiStatus = getGeminiStatus(error);
    if (isTransientGeminiError(error)) {
      return NextResponse.json(
        { error: "Gemini is temporarily busy or unreachable. We retried automatically; please try generating the draft again in a moment." },
        { status: 503, headers: { "Retry-After": "10" } }
      );
    }
    if (geminiStatus !== undefined || message.includes("GoogleGenerativeAI")) {
      return NextResponse.json({ error: "Gemini could not generate this draft. Please try again shortly." }, { status: 502 });
    }
    const status = message.includes("token") || message.includes("Firebase") ? 401 : error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ error: status === 500 ? "Draft generation failed due to a server error." : message }, { status });
  }
}
