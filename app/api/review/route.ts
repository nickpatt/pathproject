import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { QA_SYSTEM, qaUserMessage } from "@/lib/prompts";
import { checkRateLimit } from "@/lib/rateLimit";
import { MAX_INPUT_LENGTH, MIN_INPUT_LENGTH } from "@/lib/constants";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const reviewJsonSchema = {
  type: "object",
  properties: {
    score: { type: "number", description: "0-100" },
    missing: { type: "array", items: { type: "string" } },
    ambiguities: { type: "array", items: { type: "string" } },
    questions: { type: "array", items: { type: "string" } },
  },
  required: ["score", "missing", "ambiguities", "questions"],
  additionalProperties: false,
} as const;

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { ok } = checkRateLimit(ip);
    if (!ok) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const text: string = typeof body?.text === "string" ? body.text.trim() : "";
    const appSpec = body?.appSpec ?? undefined;

    if (!text) {
      return NextResponse.json(
        { error: "Please provide requirements text (field: text)." },
        { status: 400 }
      );
    }
    if (text.length < MIN_INPUT_LENGTH) {
      return NextResponse.json(
        { error: `Requirements too short (min ${MIN_INPUT_LENGTH} characters).` },
        { status: 400 }
      );
    }
    const truncated = text.length > MAX_INPUT_LENGTH;
    const inputText = truncated ? text.slice(0, MAX_INPUT_LENGTH) : text;
    const appSpecJson = appSpec ? JSON.stringify(appSpec, null, 0) : undefined;

    const userContent = qaUserMessage(inputText, appSpecJson);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        { role: "system", content: QA_SYSTEM },
        { role: "user", content: userContent },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "SpecReview",
          strict: true,
          schema: reviewJsonSchema as Record<string, unknown>,
        },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "No content in model response" }, { status: 502 });
    }

    let result: { score: number; missing: string[]; ambiguities: string[]; questions: string[] };
    try {
      result = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid JSON from model", raw }, { status: 502 });
    }

    return NextResponse.json({
      ...result,
      truncated: truncated || undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Review failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
