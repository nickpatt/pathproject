import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { appSpecJsonSchema } from "@/lib/schema";
import { CODE_EXTRACTION_SYSTEM, codeExtractionUserMessage } from "@/lib/prompts";
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
    const files = body?.files as Array<{ path: string; content: string }> | undefined;

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "Please provide an array of files (each with path and content)." },
        { status: 400 }
      );
    }

    const normalized = files
      .filter((f: unknown) => f && typeof f === "object" && "path" in f && "content" in f)
      .map((f: { path: string; content: string }) => ({
        path: String(f.path),
        content: String(f.content),
      }));

    if (normalized.length === 0) {
      return NextResponse.json(
        { error: "Each file must have path and content (string)." },
        { status: 400 }
      );
    }

    const fullText = codeExtractionUserMessage(normalized);
    if (fullText.length < MIN_INPUT_LENGTH) {
      return NextResponse.json(
        { error: `Total code length too short (min ${MIN_INPUT_LENGTH} characters). Add more files or ensure content is read as text.` },
        { status: 400 }
      );
    }

    const truncated = fullText.length > MAX_INPUT_LENGTH;
    const inputText = truncated ? fullText.slice(0, MAX_INPUT_LENGTH) : fullText;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        { role: "system", content: CODE_EXTRACTION_SYSTEM },
        { role: "user", content: inputText },
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
      return NextResponse.json({
        error: "Schema validation failed",
        detail: validated.error,
      }, { status: 502 });
    }

    return NextResponse.json({
      appSpec: validated.data,
      truncated: truncated || undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extract from code failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
