/**
 * Integration tests for POST /api/extract.
 * Run with: npm run test
 * Requires OPENAI_API_KEY for full integration; empty input test works without.
 */
import { describe, it, expect } from "vitest";
import { POST } from "./route";

function nextRequest(body: { text?: string }) {
  return new Request("http://localhost/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

describe("POST /api/extract", () => {
  it("returns friendly error for empty string", async () => {
    const res = await POST(nextRequest({ text: "" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(typeof data.error).toBe("string");
  });

  it("returns 400 for missing text", async () => {
    const res = await POST(nextRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 for too short input", async () => {
    const res = await POST(nextRequest({ text: "hi" }));
    expect(res.status).toBe(400);
  });
});
