import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { appSpecJsonSchema } from "@/lib/schema";
import { EXTRACTION_SYSTEM, EXTRACTION_USER_PREFIX } from "@/lib/prompts";
import { validateAppSpec } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rateLimit";
import { MAX_INPUT_LENGTH, MIN_INPUT_LENGTH } from "@/lib/constants";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM },
        { role: "user", content: EXTRACTION_USER_PREFIX + inputText },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "AppSpec",
          strict: true,
          schema: appSpecJsonSchema as Record<string, unknown>,
        },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "No content in model response" }, { status: 502 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid JSON from model", raw }, { status: 502 });
    }

    const validated = validateAppSpec(parsed);
    if (!validated.success) {
      return NextResponse.json({ error: "Schema validation failed", detail: validated.error }, { status: 502 });
    }

    return NextResponse.json({
      appSpec: validated.data,
      truncated: truncated || undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extract failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
